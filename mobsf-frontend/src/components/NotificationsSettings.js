// src/components/NotificationsSettings.js
import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { getNotificationsConfig, updateNotificationsConfig, testEmailConfig, getScans, sendReportEmail } from '../api';

export default function NotificationsSettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedReportHash, setSelectedReportHash] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const [sendReportResult, setSendReportResult] = useState(null);

  useEffect(() => {
    loadConfig();
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = await getScans(1, 100);
      setReports(res.data.content || []);
    } catch (err) {
      console.error('Error loading reports:', err);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await getNotificationsConfig();
      setConfig(res.data);
    } catch (err) {
      console.error('Error loading config:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      await updateNotificationsConfig(config);
      setMessage('Settings saved successfully!');
    } catch (err) {
      setMessage('Failed to save settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await testEmailConfig();
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendReport = async () => {
    if (!selectedReportHash) {
      alert('Please select a report to send');
      return;
    }

    setSendingReport(true);
    setSendReportResult(null);
    try {
      const res = await sendReportEmail(selectedReportHash);
      setSendReportResult(res.data);
      if (res.data.success) {
        setSelectedReportHash('');
      }
    } catch (err) {
      setSendReportResult({ success: false, error: err.response?.data?.error || err.message });
    } finally {
      setSendingReport(false);
    }
  };

  if (!config) {
    return <div>Loading...</div>;
  }

  return (
    <Card style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
      <Card.Header className="fw-bold">📧 Email Notifications</Card.Header>
      <Card.Body>
        {message && (
          <Alert variant={message.includes('success') ? 'success' : 'danger'}>
            {message}
          </Alert>
        )}

        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            label="Enable Email Notifications"
            checked={config.email.enabled}
            onChange={(e) => setConfig({
              ...config,
              email: { ...config.email, enabled: e.target.checked }
            })}
          />
        </Form.Group>

        {config.email.enabled && (
          <>
            {/* Email Service Type Selection */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Email Service Type</Form.Label>
              <Form.Select
                value={config.emailService?.type || 'smtp'}
                onChange={(e) => setConfig({
                  ...config,
                  emailService: {
                    ...config.emailService,
                    type: e.target.value
                  }
                })}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <option value="smtp">SMTP (Gmail, Outlook, etc.)</option>
                <option value="sendgrid">SendGrid (API Key - Easier)</option>
              </Form.Select>
              <Form.Text className="text-muted small">
                {config.emailService?.type === 'sendgrid' 
                  ? 'SendGrid is easier - just requires an API key. Get one free at sendgrid.com'
                  : 'SMTP requires server configuration'}
              </Form.Text>
            </Form.Group>

            {/* SendGrid Configuration */}
            {config.emailService?.type === 'sendgrid' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>SendGrid API Key <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="password"
                    value={config.emailService?.sendgridApiKey || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      emailService: {
                        ...config.emailService,
                        sendgridApiKey: e.target.value
                      }
                    })}
                    placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)'
                    }}
                  />
                  <Form.Text className="text-muted small">
                    Get your API key from <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer">SendGrid Dashboard</a> (Free tier available)
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>From Email <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="email"
                    value={config.email.from}
                    onChange={(e) => setConfig({
                      ...config,
                      email: { ...config.email, from: e.target.value }
                    })}
                    placeholder="your-email@example.com"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)'
                    }}
                  />
                  <Form.Text className="text-muted small">
                    Your verified sender email address in SendGrid
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>To Emails (comma-separated) <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={config.email.to.join(', ')}
                    onChange={(e) => setConfig({
                      ...config,
                      email: {
                        ...config.email,
                        to: e.target.value.split(',').map(e => e.trim()).filter(e => e)
                      }
                    })}
                    placeholder="recipient1@example.com, recipient2@example.com"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)'
                    }}
                  />
                  <Form.Text className="text-muted small">
                    Comma-separated list of recipient email addresses
                  </Form.Text>
                </Form.Group>
              </>
            )}

            {/* SMTP Configuration */}
            {config.emailService?.type === 'smtp' && (
            <>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Label>SMTP Host <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  value={config.email.smtp.host}
                  onChange={(e) => setConfig({
                    ...config,
                    email: {
                      ...config.email,
                      smtp: { ...config.email.smtp, host: e.target.value }
                    }
                  })}
                  placeholder="smtp.gmail.com"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                />
                <Form.Text className="text-muted small">
                  Enter server address only (e.g., smtp.gmail.com), NOT your email address
                </Form.Text>
              </Col>
              <Col md={3}>
                <Form.Label>Port</Form.Label>
                <Form.Control
                  type="number"
                  value={config.email.smtp.port}
                  onChange={(e) => setConfig({
                    ...config,
                    email: {
                      ...config.email,
                      smtp: { ...config.email.smtp, port: parseInt(e.target.value) }
                    }
                  })}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                />
              </Col>
              <Col md={3}>
                <Form.Label>Secure (TLS)</Form.Label>
                <Form.Check
                  type="switch"
                  checked={config.email.smtp.secure}
                  onChange={(e) => setConfig({
                    ...config,
                    email: {
                      ...config.email,
                      smtp: { ...config.email.smtp, secure: e.target.checked }
                    }
                  })}
                />
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Label>Username</Form.Label>
                <Form.Control
                  type="text"
                  value={config.email.smtp.auth.user}
                  onChange={(e) => setConfig({
                    ...config,
                    email: {
                      ...config.email,
                      smtp: {
                        ...config.email.smtp,
                        auth: { ...config.email.smtp.auth, user: e.target.value }
                      }
                    }
                  })}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={config.email.smtp.auth.pass === '***' ? '' : config.email.smtp.auth.pass}
                  onChange={(e) => setConfig({
                    ...config,
                    email: {
                      ...config.email,
                      smtp: {
                        ...config.email.smtp,
                        auth: { ...config.email.smtp.auth, pass: e.target.value }
                      }
                    }
                  })}
                  placeholder={config.email.smtp.auth.pass === '***' ? 'Enter password' : ''}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                />
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>From Email <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="email"
                value={config.email.from}
                onChange={(e) => setConfig({
                  ...config,
                  email: { ...config.email, from: e.target.value }
                })}
                placeholder="your-email@gmail.com"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              />
              <Form.Text className="text-muted small">
                Your email address (e.g., your-email@gmail.com)
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>To Emails (comma-separated) <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                value={config.email.to.join(', ')}
                onChange={(e) => setConfig({
                  ...config,
                  email: {
                    ...config.email,
                    to: e.target.value.split(',').map(e => e.trim()).filter(e => e)
                  }
                })}
                placeholder="recipient1@example.com, recipient2@example.com"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              />
              <Form.Text className="text-muted small">
                Comma-separated list of recipient email addresses
              </Form.Text>
              </Form.Group>
            </>
            )}
          </>
        )}

        <hr />

        <h5 className="mb-3">🔔 Alerts</h5>
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            label="Notify on Scan Completion"
            checked={config.alerts.scanComplete}
            onChange={(e) => setConfig({
              ...config,
              alerts: { ...config.alerts, scanComplete: e.target.checked }
            })}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            label="Alert on Critical Vulnerabilities"
            checked={config.alerts.criticalVulnerabilities}
            onChange={(e) => setConfig({
              ...config,
              alerts: { ...config.alerts, criticalVulnerabilities: e.target.checked }
            })}
          />
        </Form.Group>

        <div className="d-flex gap-2">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={loading}
          >
            💾 Save Settings
          </Button>
          {config.email.enabled && (
            <Button
              variant="outline-info"
              onClick={handleTestEmail}
              disabled={loading}
            >
              ✉️ Test Email
            </Button>
          )}
        </div>

        {testResult && (
          <Alert variant={testResult.success ? 'success' : 'danger'} className="mt-3">
            {testResult.success ? (
              <>
                <strong>✅ Test email sent successfully!</strong>
                <div className="small mt-2">Check your inbox for the test email.</div>
              </>
            ) : (
              <>
                <strong>❌ Email Test Failed</strong>
                <div className="mt-2">
                  <strong>Error:</strong> {testResult.error}
                </div>
                {testResult.error && (testResult.error.includes('SMTP host') || testResult.error.includes('EBADNAME')) && (
                  <div className="mt-2 p-2" style={{ background: 'rgba(255,193,7,0.1)', borderRadius: '6px', fontSize: '0.9rem' }}>
                    <strong>💡 Common Mistake:</strong> SMTP Host should be a <strong>server address</strong> like <code>smtp.gmail.com</code>, 
                    NOT your email address. See <code>EMAIL_SETUP_GUIDE.md</code> for help.
                  </div>
                )}
                {testResult.error && testResult.error.includes('Authentication') && (
                  <div className="mt-2 p-2" style={{ background: 'rgba(255,193,7,0.1)', borderRadius: '6px', fontSize: '0.9rem' }}>
                    <strong>💡 For Gmail:</strong> You need to use an <strong>App Password</strong>, not your regular password. 
                    Enable 2FA and generate an app password from Google Account settings.
                  </div>
                )}
              </>
            )}
          </Alert>
        )}

        <hr className="my-4" />

        <h5 className="mb-3">📤 Send Report via Email</h5>
        <p className="text-muted small mb-3">
          Select a specific report to send to developers for verification. The email will include a complete security analysis summary.
        </p>
        
        <Form.Group className="mb-3">
          <Form.Label>Select Report</Form.Label>
          <Form.Select
            value={selectedReportHash}
            onChange={(e) => setSelectedReportHash(e.target.value)}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <option value="">-- Select a report to send --</option>
            {reports.map((report) => {
              const hash = report.MD5 || report.hash || report.md5;
              const appName = report.APP_NAME || report.app_name || report.file_name || 'Unknown App';
              return (
                <option key={hash} value={hash}>
                  {appName} ({hash.substring(0, 8)}...)
                </option>
              );
            })}
          </Form.Select>
          <Form.Text className="text-muted small">
            Choose a report from your recent scans to send via email
          </Form.Text>
        </Form.Group>

        <Button
          variant="success"
          onClick={handleSendReport}
          disabled={!selectedReportHash || sendingReport || !config.email.enabled}
          className="mb-3"
        >
          {sendingReport ? '⏳ Sending...' : '📧 Send Report via Email'}
        </Button>

        {!config.email.enabled && (
          <Alert variant="warning" className="mb-3">
            <strong>⚠️ Email notifications must be enabled</strong> to send reports. Please configure email settings above first.
          </Alert>
        )}

        {sendReportResult && (
          <Alert variant={sendReportResult.success ? 'success' : 'danger'} className="mt-3">
            {sendReportResult.success ? (
              <>
                <strong>✅ Report sent successfully!</strong>
                <div className="small mt-2">The security report has been sent to the configured email addresses.</div>
              </>
            ) : (
              <>
                <strong>❌ Failed to send report</strong>
                <div className="mt-2">
                  <strong>Error:</strong> {sendReportResult.error}
                </div>
              </>
            )}
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
}

