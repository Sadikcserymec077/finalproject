/**
 * Notification System
 * Handles email notifications, alerts, and scan completion notifications
 */

let nodemailer;
let sgMail;
try {
  nodemailer = require('nodemailer');
} catch (err) {
  console.warn('nodemailer not installed - email notifications will be disabled');
  nodemailer = null;
}
try {
  sgMail = require('@sendgrid/mail');
} catch (err) {
  console.warn('@sendgrid/mail not installed - SendGrid email service will be disabled');
  sgMail = null;
}
const fs = require('fs');
const path = require('path');

const NOTIFICATIONS_CONFIG_FILE = path.join(__dirname, 'notifications-config.json');

// Initialize notifications config
function initNotificationsConfig() {
  if (!fs.existsSync(NOTIFICATIONS_CONFIG_FILE)) {
    const config = {
      email: {
        enabled: false,
        smtp: {
          host: '',
          port: 587,
          secure: false,
          auth: {
            user: '',
            pass: ''
          }
        },
        from: '',
        to: []
      },
      alerts: {
        enabled: true,
        criticalVulnerabilities: true,
        scanComplete: true,
        webhook: {
          enabled: false,
          url: ''
        }
      },
      emailService: {
        type: 'smtp', // 'smtp' or 'sendgrid'
        sendgridApiKey: ''
      },
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(NOTIFICATIONS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  }
}

// Load notifications config
function loadNotificationsConfig() {
  initNotificationsConfig();
  try {
    const data = fs.readFileSync(NOTIFICATIONS_CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);
    
    // Migrate existing config to include emailService if missing
    if (!config.emailService) {
      config.emailService = {
        type: 'smtp',
        sendgridApiKey: ''
      };
      saveNotificationsConfig(config);
    }
    
    return config;
  } catch (err) {
    console.error('Error loading notifications config:', err);
    initNotificationsConfig();
    return loadNotificationsConfig();
  }
}

// Save notifications config
function saveNotificationsConfig(config) {
  config.lastUpdated = new Date().toISOString();
  fs.writeFileSync(NOTIFICATIONS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// Get email transporter
function getEmailTransporter() {
  if (!nodemailer) {
    return null;
  }
  
  const config = loadNotificationsConfig();
  if (!config.email.enabled || !config.email.smtp.host) {
    return null;
  }

  // Validate host is not an email address
  const host = config.email.smtp.host.trim();
  if (host.includes('@')) {
    throw new Error('SMTP Host should be a server address (e.g., smtp.gmail.com), not an email address');
  }

  try {
    return nodemailer.createTransport({
      host: host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: config.email.smtp.auth,
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });
  } catch (err) {
    console.error('Error creating email transporter:', err);
    throw new Error(`Failed to create email transporter: ${err.message}`);
  }
}

// Send email notification (supports both SMTP and SendGrid)
// attachments: Array of { filename, path } or { filename, content, contentType }
async function sendEmailNotification(subject, html, text, attachments = []) {
  const config = loadNotificationsConfig();
  if (!config.email.enabled || !config.email.to.length) {
    return { success: false, error: 'Email notifications not configured' };
  }

  // Validate email addresses
  const fromEmail = config.email.from || config.email.smtp?.auth?.user;
  if (!fromEmail || !fromEmail.includes('@')) {
    return { success: false, error: 'Invalid "From" email address' };
  }

  const toEmails = config.email.to.filter(email => email && email.includes('@'));
  if (toEmails.length === 0) {
    return { success: false, error: 'No valid recipient email addresses' };
  }

  // Use SendGrid if configured
  const emailServiceType = config.emailService?.type || 'smtp';
  const sendgridApiKey = config.emailService?.sendgridApiKey;
  
  if (emailServiceType === 'sendgrid') {
    if (!sendgridApiKey || !sendgridApiKey.trim()) {
      return { success: false, error: 'SendGrid API key is required. Please enter your API key.' };
    }
    
    if (!sgMail) {
      return { success: false, error: 'SendGrid package not installed. Run: npm install @sendgrid/mail' };
    }

    try {
      sgMail.setApiKey(sendgridApiKey.trim());
      
      // Extract name from email if available
      const fromName = fromEmail.includes('@') 
        ? fromEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        : 'Static Analysis Framework';
      
      // Prepare attachments for SendGrid
      const sendgridAttachments = [];
      for (const attachment of attachments) {
        if (attachment.path && fs.existsSync(attachment.path)) {
          const content = fs.readFileSync(attachment.path);
          sendgridAttachments.push({
            content: content.toString('base64'),
            filename: attachment.filename,
            type: attachment.contentType || 'application/octet-stream',
            disposition: 'attachment'
          });
        } else if (attachment.content) {
          const content = Buffer.isBuffer(attachment.content) 
            ? attachment.content.toString('base64')
            : Buffer.from(attachment.content).toString('base64');
          sendgridAttachments.push({
            content: content,
            filename: attachment.filename,
            type: attachment.contentType || 'application/octet-stream',
            disposition: 'attachment'
          });
        }
      }
      
      // SendGrid requires array of email addresses
      const msg = {
        to: Array.isArray(toEmails) ? toEmails : [toEmails],
        from: {
          email: fromEmail,
          name: fromName
        },
        replyTo: fromEmail,
        subject: subject,
        text: text,
        html: html,
        // Add attachments if provided
        attachments: sendgridAttachments.length > 0 ? sendgridAttachments : undefined,
        // Add headers to avoid spam
        headers: {
          'X-Entity-Ref-ID': `mobsf-${Date.now()}`,
          'List-Unsubscribe': `<mailto:${fromEmail}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'Message-ID': `<${Date.now()}-${Math.random().toString(36).substring(7)}@mobsf>`,
          'Date': new Date().toUTCString(),
          'X-Mailer': 'Static Analysis Framework',
          'X-Priority': '1',
          'Precedence': 'bulk',
          'Auto-Submitted': 'auto-generated',
        },
        // Add categories for better deliverability
        categories: ['security-scan', 'mobsf-report'],
        // Add custom args for tracking
        customArgs: {
          source: 'mobsf',
          type: 'security-report'
        },
        // Mail settings for better deliverability
        mailSettings: {
          sandboxMode: {
            enable: false
          }
        }
      };

      const response = await sgMail.send(msg);
      return { success: true, messageId: response[0]?.headers?.['x-message-id'] || 'sent' };
    } catch (error) {
      console.error('SendGrid email error:', error);
      let errorMessage = error.message;
      
      // Handle SendGrid specific errors
      if (error.response?.body?.errors) {
        const errors = error.response.body.errors;
        errorMessage = errors.map(e => {
          if (e.field) {
            return `${e.field}: ${e.message}`;
          }
          return e.message;
        }).join(', ');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to SendGrid. Check your internet connection.';
      } else if (error.message.includes('Unauthorized') || error.code === 401) {
        errorMessage = 'Invalid SendGrid API key. Please check your API key.';
      } else if (error.message.includes('Forbidden') || error.code === 403) {
        errorMessage = 'API key does not have permission to send emails. Check your SendGrid account settings.';
      } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
        errorMessage = 'SSL/TLS error. This should not happen with SendGrid. Please check your API key.';
      }
      
      return { success: false, error: `SendGrid error: ${errorMessage}` };
    }
  }

  // Fall back to SMTP
  try {
    const transporter = getEmailTransporter();
    if (!transporter) {
      return { success: false, error: 'Email transporter not configured. Please configure SMTP settings or SendGrid API key.' };
    }

    // Extract name from email if available
    const fromName = fromEmail.includes('@') 
      ? fromEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : 'Static Analysis Framework';

    // Prepare attachments for SMTP (nodemailer format)
    const smtpAttachments = [];
    for (const attachment of attachments) {
      if (attachment.path && fs.existsSync(attachment.path)) {
        smtpAttachments.push({
          filename: attachment.filename,
          path: attachment.path,
          contentType: attachment.contentType
        });
      } else if (attachment.content) {
        smtpAttachments.push({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType
        });
      }
    }

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: fromEmail,
      to: toEmails.join(', '),
      subject: subject,
      html: html,
      text: text,
      // Add attachments if provided
      attachments: smtpAttachments.length > 0 ? smtpAttachments : undefined,
      // Add headers to avoid spam
      headers: {
        'X-Entity-Ref-ID': `mobsf-${Date.now()}`,
        'List-Unsubscribe': `<mailto:${fromEmail}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'Message-ID': `<${Date.now()}-${Math.random().toString(36).substring(7)}@mobsf>`,
        'Date': new Date().toUTCString(),
        'X-Mailer': 'Static Analysis Framework',
        'X-Priority': '1',
        'Precedence': 'bulk',
        'Auto-Submitted': 'auto-generated',
        'Return-Path': fromEmail,
      },
      // Add priority
      priority: 'high',
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    let errorMessage = error.message;
    
    // Provide helpful error messages
    if (error.code === 'EBADNAME' || error.message.includes('EBADNAME')) {
      errorMessage = 'Invalid SMTP host. Make sure you entered the server address (e.g., smtp.gmail.com), not an email address.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to SMTP server. Check the host and port settings.';
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Check your username and password.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. Check your network and SMTP server settings.';
    }
    
    return { success: false, error: errorMessage };
  }
}

// Send scan completion notification
// Optionally attach PDF and JSON reports
async function notifyScanComplete(hash, appName, score, findings, attachReports = true) {
  const config = loadNotificationsConfig();
  if (!config.alerts.scanComplete) {
    return;
  }

  // Prepare attachments (PDF and JSON reports)
  const attachments = [];
  if (attachReports) {
    const REPORTS_DIR = path.join(__dirname, 'reports');
    const JSON_DIR = path.join(REPORTS_DIR, 'json');
    const PDF_DIR = path.join(REPORTS_DIR, 'pdf');
    
    // Ensure PDF directory exists
    if (!fs.existsSync(PDF_DIR)) {
      fs.mkdirSync(PDF_DIR, { recursive: true });
    }
    
    const pdfPath = path.join(PDF_DIR, `${hash}.pdf`);
    
    // Generate PDF if it doesn't exist
    if (!fs.existsSync(pdfPath)) {
      try {
        const axios = require('axios');
        const MOBSF_URL = process.env.MOBSF_URL || 'http://localhost:8000';
        const MOBSF_API_KEY = process.env.MOBSF_API_KEY || '';
        
        // Generate PDF from MobSF
        const data = new URLSearchParams();
        data.append('hash', hash);
        
        // Use same header format as server.js (mobHeaders)
        const headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': MOBSF_API_KEY,
          'X-Mobsf-Api-Key': MOBSF_API_KEY
        };
        
        const resp = await axios.post(`${MOBSF_URL}/api/v1/download_pdf`, data.toString(), {
          headers: headers,
          responseType: 'arraybuffer',
        });
        
        // Save PDF
        fs.writeFileSync(pdfPath, Buffer.from(resp.data), 'binary');
        console.log(`PDF generated and saved: ${pdfPath}`);
      } catch (err) {
        console.error(`Failed to generate PDF for hash ${hash}:`, err.message);
        // Continue without PDF if generation fails
      }
    }
    
    // Attach PDF (primary attachment)
    if (fs.existsSync(pdfPath)) {
      attachments.push({
        filename: `${(appName || hash).replace(/[^a-zA-Z0-9]/g, '_')}_security_report.pdf`,
        path: pdfPath,
        contentType: 'application/pdf'
      });
    }
    
    // Optionally attach JSON (secondary, only if PDF is not available or as additional info)
    // Commented out to prioritize PDF only
    /*
    const unifiedJsonPath = path.join(JSON_DIR, `${hash}_unified.json`);
    const jsonPath = path.join(JSON_DIR, `${hash}.json`);
    
    if (fs.existsSync(unifiedJsonPath)) {
      attachments.push({
        filename: `${(appName || hash).replace(/[^a-zA-Z0-9]/g, '_')}_report.json`,
        path: unifiedJsonPath,
        contentType: 'application/json'
      });
    } else if (fs.existsSync(jsonPath)) {
      attachments.push({
        filename: `${(appName || hash).replace(/[^a-zA-Z0-9]/g, '_')}_report.json`,
        path: jsonPath,
        contentType: 'application/json'
      });
    }
    */
  }

  const criticalCount = findings.filter(f => 
    (f.severity || '').toLowerCase().includes('critical')
  ).length;
  const highCount = findings.filter(f => 
    (f.severity || '').toLowerCase().includes('high')
  ).length;
  const mediumCount = findings.filter(f => 
    (f.severity || '').toLowerCase().includes('medium')
  ).length;
  const lowCount = findings.filter(f => 
    (f.severity || '').toLowerCase().includes('low')
  ).length;

  const scoreColor = score >= 70 ? '#28a745' : score >= 40 ? '#ffc107' : '#dc3545';
  const scoreStatus = score >= 70 ? 'Good' : score >= 40 ? 'Moderate' : 'Poor';
  
  const criticalFindings = findings
    .filter(f => (f.severity || '').toLowerCase().includes('critical'))
    .slice(0, 5)
    .map(f => `<li><strong>${f.title || 'Unknown'}</strong>: ${f.description || 'No description'}</li>`)
    .join('');

  // Use cleaner subject without emoji to avoid spam filters
  const subject = `Security Scan Complete - ${appName || 'APK Analysis'}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .summary-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .score-box { text-align: center; padding: 20px; background: ${scoreColor}; color: white; border-radius: 8px; margin: 20px 0; }
    .score-value { font-size: 48px; font-weight: bold; margin: 10px 0; }
    .score-status { font-size: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .info-item { background: white; padding: 15px; border-radius: 6px; text-align: center; }
    .info-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .info-value { font-size: 24px; font-weight: bold; color: #333; margin-top: 5px; }
    .critical { color: #dc3545; }
    .high { color: #fd7e14; }
    .medium { color: #ffc107; }
    .low { color: #28a745; }
    .findings-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .findings-list ul { list-style: none; padding: 0; }
    .findings-list li { padding: 10px; border-left: 4px solid #dc3545; margin: 10px 0; background: #fff5f5; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    .unsubscribe { color: #999; font-size: 11px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🔒 Security Analysis Report</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Static Analysis Framework</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        <strong>Dear Security Team,</strong><br>
        Your security scan has been completed successfully. Please find the detailed report below.
      </div>

      <div class="summary-box">
        <h2 style="margin-top: 0; color: #333;">📱 Application Information</h2>
        <p><strong>Application Name:</strong> ${appName || 'Unknown'}</p>
        <p><strong>Scan Hash:</strong> <code>${hash}</code></p>
        <p><strong>Scan Date:</strong> ${new Date().toLocaleString()}</p>
      </div>

      <div class="score-box">
        <div class="score-value">${score}/100</div>
        <div class="score-status">Security Score: ${scoreStatus}</div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Total Findings</div>
          <div class="info-value">${findings.length}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Critical</div>
          <div class="info-value critical">${criticalCount}</div>
        </div>
        <div class="info-item">
          <div class="info-label">High</div>
          <div class="info-value high">${highCount}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Medium</div>
          <div class="info-value medium">${mediumCount}</div>
        </div>
      </div>

      ${criticalCount > 0 ? `
      <div class="findings-list">
        <h3 style="color: #dc3545; margin-top: 0;">⚠️ Critical Findings (Top 5)</h3>
        <ul>
          ${criticalFindings || '<li>No critical findings details available</li>'}
        </ul>
      </div>
      ` : ''}

      <div style="text-align: center;">
        <a href="http://localhost:3000/reports?hash=${hash}" class="button">View Full Report</a>
      </div>

      ${attachments.length > 0 ? `
      <div class="summary-box" style="background: #e7f3ff; border-left: 4px solid #2196F3;">
        <h3 style="margin-top: 0; color: #1976D2;">📎 Attached Reports</h3>
        <p style="margin: 5px 0;">The following report files are attached to this email:</p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${attachments.map(att => `<li><strong>${att.filename}</strong></li>`).join('')}
        </ul>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">You can download and review the complete analysis reports from the attachments.</p>
      </div>
      ` : ''}

      <div class="footer">
        <p>This is an automated security scan report from Static Analysis Framework.</p>
        <p class="unsubscribe">
          <a href="mailto:${config.email.from || config.email.smtp?.auth?.user}?subject=unsubscribe" style="color: #999;">Unsubscribe from these notifications</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  
  const text = `
Dear Security Team,

Your security scan has been completed successfully.

Application Information:
- Application Name: ${appName || 'Unknown'}
- Scan Hash: ${hash}
- Scan Date: ${new Date().toLocaleString()}

Security Score: ${score}/100 (${scoreStatus})

Summary:
- Total Findings: ${findings.length}
- Critical Issues: ${criticalCount}
- High Issues: ${highCount}
- Medium Issues: ${mediumCount}
- Low Issues: ${lowCount}

${criticalCount > 0 ? `\n⚠️ Critical Findings:\n${findings.filter(f => (f.severity || '').toLowerCase().includes('critical')).slice(0, 5).map(f => `- ${f.title || 'Unknown'}: ${f.description || 'No description'}`).join('\n')}\n` : ''}

View Full Report: http://localhost:3000/reports?hash=${hash}

${attachments.length > 0 ? `
Attached Reports:
${attachments.map(att => `- ${att.filename}`).join('\n')}

The complete analysis reports are attached to this email for your review.
` : ''}

---
This is an automated security scan report from Static Analysis Framework.
  `;

  if (config.email.enabled) {
    await sendEmailNotification(subject, html, text, attachments);
  }

  // Webhook notification
  if (config.alerts.webhook.enabled && config.alerts.webhook.url) {
    try {
      const axios = require('axios');
      await axios.post(config.alerts.webhook.url, {
        event: 'scan_complete',
        hash,
        appName,
        score,
        findings: findings.length,
        criticalCount,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Webhook notification error:', err);
    }
  }
}

// Send critical vulnerability alert
async function notifyCriticalVulnerability(hash, appName, vulnerabilities) {
  const config = loadNotificationsConfig();
  if (!config.alerts.criticalVulnerabilities) {
    return;
  }

  const vulnList = vulnerabilities.slice(0, 10).map(v => 
    `<li style="padding: 15px; margin: 10px 0; background: #fff5f5; border-left: 4px solid #dc3545; border-radius: 4px;">
      <strong style="color: #dc3545;">${v.title || v.name || 'Unknown Vulnerability'}</strong><br>
      <span style="color: #666; font-size: 14px;">${v.description || 'No description available'}</span>
      ${v.location ? `<br><small style="color: #999;">Location: ${v.location}</small>` : ''}
    </li>`
  ).join('');

  // Use cleaner subject without emoji to avoid spam filters
  const subject = `Critical Vulnerability Alert - ${appName || 'APK Analysis'}`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .alert-box { background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .vuln-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .vuln-list ul { list-style: none; padding: 0; margin: 0; }
    .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🚨 Critical Vulnerability Alert</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Immediate Action Required</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        <strong>Dear Security Team,</strong><br>
        Critical security vulnerabilities have been detected in your application. Immediate review is recommended.
      </div>

      <div class="alert-box">
        <h2 style="color: #dc3545; margin-top: 0;">⚠️ Critical Issues Detected</h2>
        <p><strong>Application:</strong> ${appName || 'Unknown'}</p>
        <p><strong>Scan Hash:</strong> <code>${hash}</code></p>
        <p><strong>Total Critical Vulnerabilities:</strong> <span style="color: #dc3545; font-size: 24px; font-weight: bold;">${vulnerabilities.length}</span></p>
      </div>

      <div class="vuln-list">
        <h3 style="color: #dc3545; margin-top: 0;">🔍 Detected Vulnerabilities</h3>
        <ul>
          ${vulnList || '<li>No vulnerability details available</li>'}
        </ul>
        ${vulnerabilities.length > 10 ? `<p style="color: #666; font-size: 14px;"><em>Showing top 10 of ${vulnerabilities.length} critical vulnerabilities. View full report for complete list.</em></p>` : ''}
      </div>

      <div style="text-align: center;">
        <a href="http://localhost:3000/reports?hash=${hash}" class="button">View Full Report & Fix Issues</a>
      </div>

      <div class="footer">
        <p>This is an automated security alert from Static Analysis Framework.</p>
        <p><strong>Action Required:</strong> Please review and address these critical vulnerabilities as soon as possible.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  const text = `
Dear Security Team,

Critical security vulnerabilities have been detected in your application. Immediate review is recommended.

⚠️ Critical Vulnerability Alert

Application: ${appName || 'Unknown'}
Scan Hash: ${hash}
Total Critical Vulnerabilities: ${vulnerabilities.length}

Detected Vulnerabilities:
${vulnerabilities.slice(0, 10).map(v => `- ${v.title || v.name || 'Unknown'}: ${v.description || 'No description'}\n  Location: ${v.location || 'N/A'}`).join('\n\n')}

${vulnerabilities.length > 10 ? `\n(Showing top 10 of ${vulnerabilities.length} critical vulnerabilities. View full report for complete list.)\n` : ''}

View Full Report: http://localhost:3000/reports?hash=${hash}

---
This is an automated security alert from Static Analysis Framework.
Action Required: Please review and address these critical vulnerabilities as soon as possible.
  `;

  if (config.email.enabled) {
    await sendEmailNotification(subject, html, text);
  }

  // Webhook notification
  if (config.alerts.webhook.enabled && config.alerts.webhook.url) {
    try {
      const axios = require('axios');
      await axios.post(config.alerts.webhook.url, {
        event: 'critical_vulnerability',
        hash,
        appName,
        vulnerabilities: vulnerabilities.length,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Webhook notification error:', err);
    }
  }
}

// Test email configuration
async function testEmailConfig() {
  const config = loadNotificationsConfig();
  if (!config.email.enabled) {
    return { success: false, error: 'Email notifications not enabled' };
  }

  try {
    // Use cleaner subject without emoji to avoid spam filters
    const subject = 'Test Email - Static Analysis Framework';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .success-box { background: #d4edda; border: 2px solid #28a745; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✅ Email Test Successful</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Static Analysis Framework</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        <strong>Dear User,</strong><br>
        This is a test email to verify your email notification configuration.
      </div>

      <div class="success-box">
        <h2 style="color: #28a745; margin-top: 0;">✓ Email Configuration Working!</h2>
        <p>Your email notifications are properly configured and ready to use.</p>
        <p>You will receive email notifications when:</p>
        <ul style="text-align: left; display: inline-block;">
          <li>Security scans are completed</li>
          <li>Critical vulnerabilities are detected</li>
        </ul>
      </div>

      <div class="footer">
        <p>This is an automated test email from Static Analysis Framework.</p>
        <p>If you received this email, your configuration is working correctly!</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
    const text = `
Dear User,

This is a test email to verify your email notification configuration.

✓ Email Configuration Working!

Your email notifications are properly configured and ready to use.

You will receive email notifications when:
- Security scans are completed
- Critical vulnerabilities are detected

---
This is an automated test email from Static Analysis Framework.
If you received this email, your configuration is working correctly!
    `;

    return await sendEmailNotification(subject, html, text);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  loadNotificationsConfig,
  saveNotificationsConfig,
  sendEmailNotification,
  notifyScanComplete,
  notifyCriticalVulnerability,
  testEmailConfig
};

