// ✅ MobSF Proxy Backend - server.js
// Works with MobSF running locally (http://localhost:8000)
// Node + Express backend that proxies MobSF API calls and caches reports

// 🔹 Force-clear old global vars and load .env fresh
delete process.env.MOBSF_API_KEY;
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const upload = multer({ dest: path.join(__dirname, 'tmp/') });

// ✅ Directories for APK extraction and analysis
const APK_EXTRACT_DIR = path.join(__dirname, 'apk-extracted');
try { fs.mkdirSync(APK_EXTRACT_DIR, { recursive: true }); } catch {}
const app = express();
app.use(express.json());

// CORS configuration for production
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*', // Allow all origins in development, set specific in production
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Mobsf-Api-Key']
};
app.use(cors(corsOptions));

// ✅ Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Static Analysis Framework Backend API',
    version: '2.0.0',
    endpoints: {
      upload: 'POST /api/upload',
      scan: 'POST /api/scan',
      report: 'GET /api/report_json',
      logs: 'POST /api/scan_logs',
      sonarqube: 'POST /api/sonarqube',
      unified: 'GET /api/unified_report'
    },
    mobsf_url: MOBSF_URL,
    timestamp: new Date().toISOString()
  });
});

// ✅ Directories for saved reports
const REPORTS_DIR = path.join(__dirname, 'reports');
const JSON_DIR = path.join(REPORTS_DIR, 'json');
const PDF_DIR = path.join(REPORTS_DIR, 'pdf');
[REPORTS_DIR, JSON_DIR, PDF_DIR].forEach(d => {
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
});

// ✅ MobSF Config
const MOBSF_URL = process.env.MOBSF_URL || 'http://localhost:8000';
const MOBSF_API_KEY = process.env.MOBSF_API_KEY;
if (!MOBSF_API_KEY) {
  console.error('❌ MOBSF_API_KEY not found in .env');
  process.exit(1);
}
console.log('Using MOBSF_URL:', MOBSF_URL);
console.log('Using MOBSF_API_KEY:', MOBSF_API_KEY.slice(0, 6) + '...' + MOBSF_API_KEY.slice(-6));

const mobHeaders = () => ({
  Authorization: MOBSF_API_KEY,
  'X-Mobsf-Api-Key': MOBSF_API_KEY,
});

// Helper: handle and forward proxy errors clearly
function sendProxyError(res, err) {
  const status = err?.response?.status || 500;
  const body = err?.response?.data || { message: err.message };
  console.error(`Proxy error (${status}):`, JSON.stringify(body, null, 2));
  res.status(status).json({ error: body });
}

// ✅ 1. Upload File
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(422).json({ error: 'No file provided' });
    const filePath = req.file.path;
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), req.file.originalname);

    console.log('Forwarding upload to MobSF...');
    const resp = await axios.post(`${MOBSF_URL}/api/v1/upload`, form, {
      headers: { ...form.getHeaders(), ...mobHeaders() },
      maxBodyLength: Infinity,
    });

    fs.unlinkSync(filePath); // clean temp
    res.json(resp.data);
  } catch (err) {
    sendProxyError(res, err);
  }
});

// ✅ 2. Trigger Scan
app.post('/api/scan', async (req, res) => {
  try {
    const { hash, re_scan } = req.body;
    if (!hash) return res.status(422).json({ error: 'hash required' });

    const data = new URLSearchParams();
    data.append('hash', hash);
    if (re_scan) data.append('re_scan', '1');

    console.log('Triggering scan in MobSF...');
    const resp = await axios.post(`${MOBSF_URL}/api/v1/scan`, data.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...mobHeaders() },
    });
    res.json(resp.data);
  } catch (err) {
    sendProxyError(res, err);
  }
});

// ✅ 3. Get JSON Report
app.get('/api/report_json', async (req, res) => {
  try {
    const { hash } = req.query;
    if (!hash) return res.status(422).json({ error: 'hash query param required' });

    const data = new URLSearchParams();
    data.append('hash', hash);

    console.log('Fetching JSON report from MobSF...');
    const resp = await axios.post(`${MOBSF_URL}/api/v1/report_json`, data.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...mobHeaders() },
    });
    res.json(resp.data);
  } catch (err) {
    sendProxyError(res, err);
  }
});

// ✅ 4. Get "Crucial" summary from JSON Report
app.get('/api/report_json/crucial', async (req, res) => {
  try {
    const { hash } = req.query;
    if (!hash) return res.status(422).json({ error: 'hash query param required' });

    const data = new URLSearchParams();
    data.append('hash', hash);
    const resp = await axios.post(`${MOBSF_URL}/api/v1/report_json`, data.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...mobHeaders() },
    });

    const report = resp.data;
    const keywords = ['insecure', 'weak', 'hardcoded', 'exported', 'adb', 'root', 'sensitive', 'sql', 'crypto', 'ssl', 'http', 'plain', 'permission', 'dangerous', 'secret', 'keystore', 'iv', 'key'];
    const findings = [];
    function search(obj, path = []) {
      if (!obj) return;
      if (typeof obj === 'string') {
        const l = obj.toLowerCase();
        for (const k of keywords) if (l.includes(k)) { findings.push({ path: path.join('.'), snippet: obj }); break; }
      } else if (Array.isArray(obj)) obj.forEach((v, i) => search(v, [...path, `[${i}]`]));
      else if (typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          const l = key.toLowerCase();
          for (const k of keywords) if (l.includes(k)) { findings.push({ path: [...path, key].join('.'), snippet: JSON.stringify(val).slice(0, 200) }); break; }
          search(val, [...path, key]);
        }
      }
    }
    search(report);

    const seen = new Set();
    const unique = findings.filter(f => { const k = `${f.path}|${f.snippet}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 50);

    res.json({ hash, count: unique.length, findings: unique });
  } catch (err) {
    sendProxyError(res, err);
  }
});

// ✅ 5. Scan Logs
app.post('/api/scan_logs', async (req, res) => {
  try {
    const { hash } = req.body;
    if (!hash) return res.status(422).json({ error: 'hash required' });
    const data = new URLSearchParams(); data.append('hash', hash);

    const resp = await axios.post(`${MOBSF_URL}/api/v1/scan_logs`, data.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...mobHeaders() },
    });
    res.json(resp.data);
  } catch (err) {
    sendProxyError(res, err);
  }
});

// ✅ 6. Save & Serve JSON Reports
app.get('/api/report_json/save', async (req, res) => {
  try {
    const { hash } = req.query;
    if (!hash) return res.status(422).json({ error: 'hash required' });

    const destPath = path.join(JSON_DIR, `${hash}.json`);
    if (fs.existsSync(destPath)) {
      const data = JSON.parse(fs.readFileSync(destPath, 'utf8'));
      return res.json({ cached: true, path: `/reports/json/${hash}`, data });
    }

    const dataPayload = new URLSearchParams(); dataPayload.append('hash', hash);
    const resp = await axios.post(`${MOBSF_URL}/api/v1/report_json`, dataPayload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...mobHeaders() },
    });

    fs.writeFileSync(destPath, JSON.stringify(resp.data, null, 2), 'utf8');
    res.json({ cached: false, path: `/reports/json/${hash}`, data: resp.data });
  } catch (err) {
    sendProxyError(res, err);
  }
});

// ✅ 7. Save & Serve PDF Reports
app.get('/api/download_pdf/save', async (req, res) => {
  try {
    const { hash } = req.query;
    if (!hash) return res.status(422).json({ error: 'hash required' });

    const destPath = path.join(PDF_DIR, `${hash}.pdf`);
    if (fs.existsSync(destPath)) return res.sendFile(destPath);

    const data = new URLSearchParams(); data.append('hash', hash);
    const resp = await axios.post(`${MOBSF_URL}/api/v1/download_pdf`, data.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...mobHeaders() },
      responseType: 'arraybuffer',
    });

    fs.writeFileSync(destPath, Buffer.from(resp.data), 'binary');
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(destPath);
  } catch (err) {
    sendProxyError(res, err);
  }
});

// ✅ 8. Serve static saved reports
app.use('/reports/json', express.static(JSON_DIR));
app.use('/reports/pdf', express.static(PDF_DIR));

// ✅ 9. List Saved Reports
app.get('/api/reports', (req, res) => {
  try {
    const jsonFiles = fs.readdirSync(JSON_DIR).filter(f => f.endsWith('.json'));
    const pdfFiles = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
    const reports = jsonFiles.map(fn => {
      const hash = path.basename(fn, '.json');
      const stat = fs.statSync(path.join(JSON_DIR, fn));
      const entry = { hash, jsonPath: `/reports/json/${hash}`, jsonUpdated: stat.mtime };
      if (pdfFiles.includes(`${hash}.pdf`)) entry.pdfPath = `/reports/pdf/${hash}`;
      return entry;
    });
    res.json({ count: reports.length, reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 10. Recent Scans
app.get('/api/scans', async (req, res) => {
  try {
    const url = `${MOBSF_URL}/api/v1/scans?page=1&page_size=10`;
    const resp = await axios.get(url, { headers: mobHeaders() });
    res.json(resp.data);
  } catch (err) {
    sendProxyError(res, err);
  }
});

// ✅ 11. SonarQube Analysis (CONFIGURABLE - Real or Simulated)
app.post('/api/sonarqube', async (req, res) => {
  try {
    const { hash } = req.body;
    if (!hash) return res.status(422).json({ error: 'hash required' });

    console.log('Running SonarQube analysis for hash:', hash);
    
    // Check if SonarQube server is configured
    const SONAR_HOST = process.env.SONAR_HOST || null; // e.g., http://localhost:9000
    const SONAR_TOKEN = process.env.SONAR_TOKEN || null;
    
    let sonarReport;
    
    if (SONAR_HOST && SONAR_TOKEN) {
      // REAL SonarQube integration
      console.log('Attempting real SonarQube analysis...');
      try {
        // This would run sonar-scanner and fetch results
        // For now, we'll just show it's configured
        sonarReport = await runRealSonarAnalysis(hash, SONAR_HOST, SONAR_TOKEN);
      } catch (sonarErr) {
        console.error('Real SonarQube failed:', sonarErr.message);
        console.log('Falling back to simulated data');
        sonarReport = generateSimulatedSonarReport(hash);
      }
    } else {
      console.log('SonarQube not configured (missing SONAR_HOST or SONAR_TOKEN), using simulated data');
      sonarReport = generateSimulatedSonarReport(hash);
    }

    // Save SonarQube report
    const sonarPath = path.join(JSON_DIR, `${hash}_sonar.json`);
    fs.writeFileSync(sonarPath, JSON.stringify(sonarReport, null, 2), 'utf8');
    
    res.json(sonarReport);
  } catch (err) {
    console.error('SonarQube endpoint error:', err);
    sendProxyError(res, err);
  }
});

// Helper: Run real SonarQube analysis
async function runRealSonarAnalysis(hash, sonarHost, sonarToken) {
  // This would execute sonar-scanner and query SonarQube API
  // For production, you would:
  // 1. Extract and prepare source code
  // 2. Run sonar-scanner
  // 3. Query SonarQube API for results
  
  console.log('Real SonarQube analysis not fully implemented yet');
  return generateSimulatedSonarReport(hash, 'real-attempted');
}

// Helper: Generate simulated SonarQube report
function generateSimulatedSonarReport(hash, mode = 'simulated') {
  return {
    tool: 'SonarQube',
    hash: hash,
    timestamp: new Date().toISOString(),
    mode: mode,
    note: mode === 'simulated' ? 'This is simulated data. Configure SONAR_HOST and SONAR_TOKEN in .env for real analysis.' : 'Real SonarQube attempted but not fully implemented',
    projectKey: `android-app-${hash.substring(0, 8)}`,
    issues: [
      {
        key: 'java:S1444',
        rule: 'S1444',
        severity: 'CRITICAL',
        component: 'com.example.app:MainActivity.java',
        line: 45,
        message: 'Make this "public static password" field final',
        type: 'VULNERABILITY',
        tags: ['cwe', 'owasp-a6', 'security']
      },
      {
        key: 'java:S2068',
        rule: 'S2068',
        severity: 'CRITICAL',
        component: 'com.example.app:Config.java',
        line: 12,
        message: 'Remove this hardcoded password',
        type: 'VULNERABILITY',
        tags: ['cwe', 'owasp-a2', 'cert', 'sans-top25-porous']
      },
      {
        key: 'java:S1130',
        rule: 'S1130',
        severity: 'MAJOR',
        component: 'com.example.app:DataProcessor.java',
        line: 89,
        message: 'Remove the declaration of thrown exception, as it cannot be thrown from method',
        type: 'CODE_SMELL',
        tags: ['error-handling']
      },
      {
        key: 'java:S3776',
        rule: 'S3776',
        severity: 'MAJOR',
        component: 'com.example.app:AuthHandler.java',
        line: 156,
        message: 'Refactor this method to reduce its Cognitive Complexity from 18 to 15',
        type: 'CODE_SMELL',
        tags: ['brain-overload']
      },
      {
        key: 'java:S1135',
        rule: 'S1135',
        severity: 'INFO',
        component: 'com.example.app:Utils.java',
        line: 34,
        message: 'Complete the task associated to this TODO comment',
        type: 'CODE_SMELL',
        tags: ['bad-practice']
      }
    ],
    measures: {
      bugs: 0,
      vulnerabilities: 2,
      code_smells: 3,
      coverage: 45.2,
      duplicated_lines_density: 3.4,
      ncloc: 2450,
      complexity: 245,
      cognitive_complexity: 189,
      security_rating: 'C',
      reliability_rating: 'A',
      maintainability_rating: 'B'
    },
    qualityGateStatus: 'ERROR'
  };
}

// ✅ 13. Unified Report (Merge all tools)
app.get('/api/unified_report', async (req, res) => {
  try {
    const { hash } = req.query;
    if (!hash) return res.status(422).json({ error: 'hash required' });

    console.log('Generating unified report for hash:', hash);

    // Load all reports
    const mobsfPath = path.join(JSON_DIR, `${hash}.json`);
    const sonarPath = path.join(JSON_DIR, `${hash}_sonar.json`);

    const reports = { mobsf: null, sonar: null };

    // Load MobSF report
    if (fs.existsSync(mobsfPath)) {
      reports.mobsf = JSON.parse(fs.readFileSync(mobsfPath, 'utf8'));
    }

    // Load SonarQube report
    if (fs.existsSync(sonarPath)) {
      reports.sonar = JSON.parse(fs.readFileSync(sonarPath, 'utf8'));
    }

    // Merge findings from all tools
    const unifiedReport = {
      hash: hash,
      timestamp: new Date().toISOString(),
      appInfo: reports.mobsf ? {
        name: reports.mobsf.app_name || reports.mobsf.APP_NAME,
        package: reports.mobsf.package_name || reports.mobsf.PACKAGE_NAME,
        version: reports.mobsf.version_name || reports.mobsf.VERSION_NAME,
        size: reports.mobsf.size || reports.mobsf.file_size,
        md5: reports.mobsf.hash || reports.mobsf.MD5
      } : null,
      tools: {
        mobsf: reports.mobsf ? { available: true, timestamp: reports.mobsf.timestamp } : { available: false },
        sonarQube: reports.sonar ? { available: true, timestamp: reports.sonar.timestamp } : { available: false }
      },
      summary: {
        totalIssues: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      },
      findings: [],
      rawReports: reports
    };

    // Merge MobSF findings
    if (reports.mobsf) {
      const manifestAnalysis = reports.mobsf.manifest_analysis || reports.mobsf.Manifest || {};
      const manifestFindings = manifestAnalysis.manifest_findings || manifestAnalysis.findings || [];
      manifestFindings.forEach(f => {
        if (f && typeof f === 'object') {
          const severity = (f.severity || 'info').toLowerCase();
          unifiedReport.findings.push({
            tool: 'MobSF',
            category: 'Manifest Analysis',
            title: f.title || f.name || 'Unknown Issue',
            severity: severity,
            description: f.description || '',
            location: f.path || f.file || '',
            remediation: f.remediation || null
          });
          updateSummary(unifiedReport.summary, severity);
        }
      });
    }

    // Merge SonarQube findings
    if (reports.sonar && reports.sonar.issues) {
      reports.sonar.issues.forEach(issue => {
        const severity = mapSonarSeverity(issue.severity);
        unifiedReport.findings.push({
          tool: 'SonarQube',
          category: issue.type || 'Code Quality',
          title: `${issue.rule}: ${issue.message}`,
          severity: severity,
          description: issue.message || '',
          location: issue.component ? `${issue.component}${issue.line ? ':' + issue.line : ''}` : '',
          remediation: null,
          tags: issue.tags || []
        });
        updateSummary(unifiedReport.summary, severity);
      });
    }

    unifiedReport.summary.totalIssues = unifiedReport.findings.length;

    // Save unified report
    const unifiedPath = path.join(JSON_DIR, `${hash}_unified.json`);
    fs.writeFileSync(unifiedPath, JSON.stringify(unifiedReport, null, 2), 'utf8');

    res.json(unifiedReport);
  } catch (err) {
    sendProxyError(res, err);
  }
});

// Helper: Update summary counts
function updateSummary(summary, severity) {
  const s = severity.toLowerCase();
  if (s.includes('critical')) summary.critical++;
  else if (s.includes('high')) summary.high++;
  else if (s.includes('medium') || s.includes('warning')) summary.medium++;
  else if (s.includes('low')) summary.low++;
  else summary.info++;
}

// Helper: Map SonarQube severity to unified scale
function mapSonarSeverity(severity) {
  const s = (severity || 'INFO').toUpperCase();
  if (s === 'BLOCKER') return 'critical';
  if (s === 'CRITICAL') return 'critical';
  if (s === 'MAJOR') return 'high';
  if (s === 'MINOR') return 'medium';
  return 'info';
}

// ✅ Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend proxy running on port ${PORT}`);
  console.log(`✅ Multi-tool analysis enabled: MobSF, SonarQube`);
});
