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
const metadata = require('./metadata');
const notifications = require('./notifications');
const auth = require('./auth');
const shareableLinks = require('./shareable-links');
const cache = require('./cache');

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

// ✅ 1. Upload File (Single or Multiple)
app.post('/api/upload', upload.array('file', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(422).json({ error: 'No file provided' });
    }

    // If single file, return single response (backward compatible)
    if (req.files.length === 1) {
      const file = req.files[0];
      const filePath = file.path;
    const form = new FormData();
      form.append('file', fs.createReadStream(filePath), file.originalname);

    console.log('Forwarding upload to MobSF...');
    const resp = await axios.post(`${MOBSF_URL}/api/v1/upload`, form, {
      headers: { ...form.getHeaders(), ...mobHeaders() },
      maxBodyLength: Infinity,
    });

    fs.unlinkSync(filePath); // clean temp
      return res.json(resp.data);
    }

    // Multiple files - process sequentially
    const results = [];
    for (const file of req.files) {
      try {
        const filePath = file.path;
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath), file.originalname);

        console.log(`Forwarding upload to MobSF: ${file.originalname}...`);
        const resp = await axios.post(`${MOBSF_URL}/api/v1/upload`, form, {
          headers: { ...form.getHeaders(), ...mobHeaders() },
          maxBodyLength: Infinity,
        });

        fs.unlinkSync(filePath); // clean temp
        results.push({
          filename: file.originalname,
          success: true,
          data: resp.data
        });
      } catch (err) {
        // Clean up file even on error
        try { fs.unlinkSync(file.path); } catch {}
        results.push({
          filename: file.originalname,
          success: false,
          error: err.response?.data?.error || err.message
        });
      }
    }

    res.json({
      multiple: true,
      count: results.length,
      results: results
    });
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

// ✅ 3. Get JSON Report (with caching)
app.get('/api/report_json', async (req, res) => {
  try {
    const { hash } = req.query;
    if (!hash) return res.status(422).json({ error: 'hash query param required' });

    // Check cache first
    const cacheKey = `report_json_${hash}`;
    const cached = cache.getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const data = new URLSearchParams();
    data.append('hash', hash);

    console.log('Fetching JSON report from MobSF...');
    const resp = await axios.post(`${MOBSF_URL}/api/v1/report_json`, data.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...mobHeaders() },
    });
    
    // Cache for 1 hour
    cache.setCache(cacheKey, resp.data, 3600000);
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
      // Ensure security score is calculated if missing
      if (!data.securityScore && !data.security_score) {
        const findings = data.manifest_analysis?.manifest_findings || [];
        const weightedPenalty = findings.reduce((sum, f) => {
          const sev = (f.severity || 'info').toLowerCase();
          if (sev.includes('critical')) return sum + 20;
          if (sev.includes('high')) return sum + 10;
          if (sev.includes('medium')) return sum + 5;
          if (sev.includes('low')) return sum + 2;
          return sum + 1;
        }, 0);
        const securityScore = Math.max(0, Math.round(100 - (weightedPenalty / Math.max(findings.length * 20, 1)) * 100));
        data.securityScore = securityScore;
        data.security_score = securityScore;
        // Update the file
        fs.writeFileSync(destPath, JSON.stringify(data, null, 2), 'utf8');
      }
      return res.json({ cached: true, path: `/reports/json/${hash}`, data });
    }

    const dataPayload = new URLSearchParams(); dataPayload.append('hash', hash);
    const resp = await axios.post(`${MOBSF_URL}/api/v1/report_json`, dataPayload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...mobHeaders() },
    });

    // Calculate and add security score to the report
    const findings = resp.data.manifest_analysis?.manifest_findings || [];
    const weightedPenalty = findings.reduce((sum, f) => {
      const sev = (f.severity || 'info').toLowerCase();
      if (sev.includes('critical')) return sum + 20;
      if (sev.includes('high')) return sum + 10;
      if (sev.includes('medium')) return sum + 5;
      if (sev.includes('low')) return sum + 2;
      return sum + 1;
    }, 0);
    const securityScore = Math.max(0, Math.round(100 - (weightedPenalty / Math.max(findings.length * 20, 1)) * 100));
    resp.data.securityScore = securityScore;
    resp.data.security_score = securityScore; // Also store with underscore for compatibility

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

// ✅ 10. Recent Scans (with persistence - load from saved JSON files)
app.get('/api/scans', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 100;
    
    // Get scans from MobSF
    let mobsfScans = [];
    try {
      const url = `${MOBSF_URL}/api/v1/scans?page=${page}&page_size=${pageSize}`;
    const resp = await axios.get(url, { headers: mobHeaders() });
      mobsfScans = resp.data.content || [];
    } catch (err) {
      console.warn('MobSF scans fetch failed, using saved files only:', err.message);
    }
    
    // Also load from saved JSON files (persistence)
    const jsonFiles = fs.readdirSync(JSON_DIR).filter(f => 
      f.endsWith('.json') && !f.includes('_sonar') && !f.includes('_unified')
    );
    
    const savedScans = [];
    jsonFiles.forEach(fn => {
      try {
        const hash = path.basename(fn, '.json');
        const reportData = JSON.parse(fs.readFileSync(path.join(JSON_DIR, fn), 'utf8'));
        const stat = fs.statSync(path.join(JSON_DIR, fn));
        
        // Check if this scan already exists in MobSF results
        const existsInMobsf = mobsfScans.some(s => (s.MD5 || s.hash || s.md5) === hash);
        
        if (!existsInMobsf) {
          // Create scan entry from saved file
          savedScans.push({
            MD5: hash,
            hash: hash,
            md5: hash,
            APP_NAME: reportData.app_name || reportData.APP_NAME || 'Unknown',
            PACKAGE_NAME: reportData.package_name || reportData.PACKAGE_NAME || '',
            VERSION_NAME: reportData.version_name || reportData.VERSION_NAME || '',
            SCAN_TYPE: 'static',
            TIMESTAMP: stat.mtime.toISOString(),
            FILE_NAME: reportData.file_name || reportData.FILE_NAME || fn,
            _fromSaved: true
          });
        }
      } catch (e) {
        console.error(`Error loading saved scan ${fn}:`, e.message);
      }
    });
    
    // Merge MobSF scans and saved scans, remove duplicates
    const allScans = [...mobsfScans];
    savedScans.forEach(saved => {
      if (!allScans.some(s => (s.MD5 || s.hash || s.md5) === saved.MD5)) {
        allScans.push(saved);
      }
    });
    
    // Sort by timestamp (newest first)
    allScans.sort((a, b) => {
      const dateA = new Date(a.TIMESTAMP || 0);
      const dateB = new Date(b.TIMESTAMP || 0);
      return dateB - dateA;
    });
    
    // Calculate security scores for all scans
    const enrichedScans = allScans.map(scan => {
      const hash = scan.MD5 || scan.hash || scan.md5;
      let securityScore = null;
      
      try {
        const jsonPath = path.join(JSON_DIR, `${hash}.json`);
        if (fs.existsSync(jsonPath)) {
          const reportData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          const findings = reportData.manifest_analysis?.manifest_findings || [];
          const weightedPenalty = findings.reduce((sum, f) => {
            const sev = (f.severity || 'info').toLowerCase();
            if (sev.includes('critical')) return sum + 20;
            if (sev.includes('high')) return sum + 10;
            if (sev.includes('medium')) return sum + 5;
            if (sev.includes('low')) return sum + 2;
            return sum + 1;
          }, 0);
          securityScore = Math.max(0, Math.round(100 - (weightedPenalty / Math.max(findings.length * 20, 1)) * 100));
        }
      } catch (e) {
        // Score calculation failed, leave as null
      }
      
      return {
        ...scan,
        securityScore
      };
    });
    
    // Paginate
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginated = enrichedScans.slice(start, end);
    
    res.json({
      content: paginated,
      totalElements: allScans.length,
      totalPages: Math.ceil(allScans.length / pageSize),
      page: page,
      pageSize: pageSize
    });
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

    // Calculate and store security score
    const securityScore = calculateSecurityScore(unifiedReport.summary);
    unifiedReport.securityScore = securityScore;
    unifiedReport.security_score = securityScore; // Also store with underscore for compatibility

    // Save unified report
    const unifiedPath = path.join(JSON_DIR, `${hash}_unified.json`);
    fs.writeFileSync(unifiedPath, JSON.stringify(unifiedReport, null, 2), 'utf8');

    // Send notification on scan complete
    notifyOnScanComplete(hash, reports.mobsf || {});

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

// ============================================
// NEW FEATURES - Enhanced API Endpoints
// ============================================

// ✅ 14. Search and Filter Reports
app.get('/api/reports/search', async (req, res) => {
  try {
    const { query, severity, dateFrom, dateTo, minScore, maxScore, tags, archived, favorite } = req.query;
    
    // Get all scans from MobSF
    const url = `${MOBSF_URL}/api/v1/scans?page=1&page_size=1000`;
    const resp = await axios.get(url, { headers: mobHeaders() });
    let scans = resp.data.content || [];
    
    // Load saved reports metadata
    const jsonFiles = fs.readdirSync(JSON_DIR).filter(f => f.endsWith('.json') && !f.includes('_sonar') && !f.includes('_unified'));
    const reportsMap = {};
    jsonFiles.forEach(fn => {
      const hash = path.basename(fn, '.json');
      try {
        const reportData = JSON.parse(fs.readFileSync(path.join(JSON_DIR, fn), 'utf8'));
        reportsMap[hash] = reportData;
      } catch (e) {}
    });
    
    // Enrich scans with metadata and filter
    let filtered = scans.map(scan => {
      const hash = scan.MD5 || scan.hash || scan.md5;
      const reportMeta = metadata.getReportMetadata(hash);
      const reportData = reportsMap[hash];
      
      // Calculate security score if report exists
      let securityScore = null;
      if (reportData) {
        const findings = reportData.manifest_analysis?.manifest_findings || [];
        const weightedPenalty = findings.reduce((sum, f) => {
          const sev = (f.severity || 'info').toLowerCase();
          if (sev.includes('critical')) return sum + 20;
          if (sev.includes('high')) return sum + 10;
          if (sev.includes('medium')) return sum + 5;
          if (sev.includes('low')) return sum + 2;
          return sum + 1;
        }, 0);
        securityScore = Math.max(0, Math.round(100 - (weightedPenalty / Math.max(findings.length * 20, 1)) * 100));
      }
      
      return {
        ...scan,
        hash,
        metadata: reportMeta,
        securityScore,
        reportData: reportData ? {
          appName: reportData.app_name || reportData.APP_NAME,
          packageName: reportData.package_name || reportData.PACKAGE_NAME,
          version: reportData.version_name || reportData.VERSION_NAME
        } : null
      };
    });
    
    // Apply filters
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(s => 
        (s.APP_NAME && s.APP_NAME.toLowerCase().includes(q)) ||
        (s.PACKAGE_NAME && s.PACKAGE_NAME.toLowerCase().includes(q)) ||
        (s.MD5 && s.MD5.toLowerCase().includes(q)) ||
        (s.reportData && s.reportData.appName && s.reportData.appName.toLowerCase().includes(q))
      );
    }
    
    if (severity) {
      // Filter by severity in findings
      filtered = filtered.filter(s => {
        if (!s.reportData) return false;
        const findings = reportsMap[s.hash]?.manifest_analysis?.manifest_findings || [];
        return findings.some(f => (f.severity || '').toLowerCase().includes(severity.toLowerCase()));
      });
    }
    
    if (dateFrom || dateTo) {
      filtered = filtered.filter(s => {
        const scanDate = new Date(s.TIMESTAMP);
        if (dateFrom && scanDate < new Date(dateFrom)) return false;
        if (dateTo && scanDate > new Date(dateTo)) return false;
        return true;
      });
    }
    
    if (minScore !== undefined || maxScore !== undefined) {
      filtered = filtered.filter(s => {
        if (s.securityScore === null) return false;
        if (minScore !== undefined && s.securityScore < parseInt(minScore)) return false;
        if (maxScore !== undefined && s.securityScore > parseInt(maxScore)) return false;
        return true;
      });
    }
    
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      filtered = filtered.filter(s => 
        tagList.some(tag => s.metadata.tags.includes(tag))
      );
    }
    
    if (archived === 'true') {
      filtered = filtered.filter(s => s.metadata.archived);
    } else if (archived === 'false') {
      filtered = filtered.filter(s => !s.metadata.archived);
    }
    
    if (favorite === 'true') {
      filtered = filtered.filter(s => s.metadata.favorite);
    }
    
    res.json({ count: filtered.length, results: filtered });
  } catch (err) {
    sendProxyError(res, err);
  }
});

// ✅ 15. Delete Report
app.delete('/api/reports/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const deleted = [];
    
    // Delete from MobSF first
    try {
      const deleteData = new URLSearchParams();
      deleteData.append('hash', hash);
      await axios.post(`${MOBSF_URL}/api/v1/delete_scan`, deleteData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...mobHeaders() },
      });
      deleted.push('mobsf_scan');
    } catch (mobsfErr) {
      console.warn('MobSF delete failed (may not exist):', mobsfErr.message);
    }
    
    // Delete JSON files
    const jsonFiles = [`${hash}.json`, `${hash}_sonar.json`, `${hash}_unified.json`];
    jsonFiles.forEach(fn => {
      const filePath = path.join(JSON_DIR, fn);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted.push(fn);
      }
    });
    
    // Delete PDF
    const pdfPath = path.join(PDF_DIR, `${hash}.pdf`);
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      deleted.push(`${hash}.pdf`);
    }
    
    // Delete metadata
    try {
      const meta = metadata.getReportMetadata(hash);
      if (meta) {
        // Metadata will be cleaned up on next access, but we can try to remove it
        // The metadata system doesn't have a direct delete, so we'll just note it
      }
    } catch (e) {}
    
    res.json({ success: true, deleted, hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 16. Bulk Delete Reports
app.post('/api/reports/bulk-delete', async (req, res) => {
  try {
    const { hashes } = req.body;
    if (!Array.isArray(hashes)) {
      return res.status(422).json({ error: 'hashes must be an array' });
    }
    
    const results = [];
    for (const hash of hashes) {
      try {
        const deleted = [];
        const jsonFiles = [`${hash}.json`, `${hash}_sonar.json`, `${hash}_unified.json`];
        jsonFiles.forEach(fn => {
          const filePath = path.join(JSON_DIR, fn);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            deleted.push(fn);
          }
        });
        const pdfPath = path.join(PDF_DIR, `${hash}.pdf`);
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
          deleted.push(`${hash}.pdf`);
        }
        results.push({ hash, success: true, deleted });
      } catch (err) {
        results.push({ hash, success: false, error: err.message });
      }
    }
    
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 17. Archive/Unarchive Report
app.post('/api/reports/:hash/archive', async (req, res) => {
  try {
    const { hash } = req.params;
    metadata.archiveReport(hash);
    res.json({ success: true, hash, archived: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/:hash/unarchive', async (req, res) => {
  try {
    const { hash } = req.params;
    metadata.unarchiveReport(hash);
    res.json({ success: true, hash, archived: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 18. Tag Management
app.post('/api/reports/:hash/tags', async (req, res) => {
  try {
    const { hash } = req.params;
    const { tag } = req.body;
    if (!tag) return res.status(422).json({ error: 'tag required' });
    metadata.addTag(hash, tag);
    res.json({ success: true, hash, tag });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reports/:hash/tags/:tag', async (req, res) => {
  try {
    const { hash, tag } = req.params;
    metadata.removeTag(hash, tag);
    res.json({ success: true, hash, tag });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tags', (req, res) => {
  try {
    const tags = metadata.getAllTags();
    res.json({ tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 19. Favorites
app.post('/api/reports/:hash/favorite', async (req, res) => {
  try {
    const { hash } = req.params;
    const isFavorite = metadata.toggleFavorite(hash);
    res.json({ success: true, hash, favorite: isFavorite });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 20. Annotations
app.post('/api/reports/:hash/annotations', async (req, res) => {
  try {
    const { hash } = req.params;
    const annotation = metadata.addAnnotation(hash, req.body);
    res.json({ success: true, annotation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reports/:hash/annotations/:id', async (req, res) => {
  try {
    const { hash, id } = req.params;
    metadata.deleteAnnotation(hash, id);
    res.json({ success: true, hash, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/:hash/false-positive', async (req, res) => {
  try {
    const { hash } = req.params;
    const { findingId } = req.body;
    metadata.markFalsePositive(hash, findingId);
    res.json({ success: true, hash, findingId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 21. Get Report Metadata
app.get('/api/reports/:hash/metadata', (req, res) => {
  try {
    const { hash } = req.params;
    const reportMeta = metadata.getReportMetadata(hash);
    res.json(reportMeta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 22. Export to CSV
app.get('/api/reports/:hash/export/csv', async (req, res) => {
  try {
    const { hash } = req.params;
    if (!hash) return res.status(422).json({ error: 'hash required' });
    
    const unifiedPath = path.join(JSON_DIR, `${hash}_unified.json`);
    if (!fs.existsSync(unifiedPath)) {
      return res.status(404).json({ error: 'Unified report not found' });
    }
    
    const unifiedReport = JSON.parse(fs.readFileSync(unifiedPath, 'utf8'));
    const findings = unifiedReport.findings || [];
    
    // Generate CSV
    const headers = ['Tool', 'Category', 'Title', 'Severity', 'Description', 'Location'];
    const rows = findings.map(f => [
      f.tool || '',
      f.category || '',
      `"${(f.title || '').replace(/"/g, '""')}"`,
      f.severity || '',
      `"${(f.description || '').replace(/"/g, '""')}"`,
      f.location || ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report-${hash}.csv"`);
    res.send(csv);
  } catch (err) {
    sendProxyError(res, err);
  }
});

// ✅ 23. Compare Reports (Fixed - works with regular JSON files too)
app.get('/api/reports/compare', async (req, res) => {
  try {
    const { hash1, hash2 } = req.query;
    if (!hash1 || !hash2) {
      return res.status(422).json({ error: 'hash1 and hash2 required' });
    }
    
    // Try unified first, then regular JSON
    let report1 = null;
    let report2 = null;
    
    const unifiedPath1 = path.join(JSON_DIR, `${hash1}_unified.json`);
    const unifiedPath2 = path.join(JSON_DIR, `${hash2}_unified.json`);
    const jsonPath1 = path.join(JSON_DIR, `${hash1}.json`);
    const jsonPath2 = path.join(JSON_DIR, `${hash2}.json`);
    
    // Load report1
    if (fs.existsSync(unifiedPath1)) {
      report1 = JSON.parse(fs.readFileSync(unifiedPath1, 'utf8'));
    } else if (fs.existsSync(jsonPath1)) {
      const data = JSON.parse(fs.readFileSync(jsonPath1, 'utf8'));
      // Convert to unified format
      const findings = data.manifest_analysis?.manifest_findings || [];
      report1 = {
        hash: hash1,
        appInfo: {
          name: data.app_name || data.APP_NAME,
          package: data.package_name || data.PACKAGE_NAME,
          version: data.version_name || data.VERSION_NAME
        },
        summary: {
          totalIssues: findings.length,
          critical: findings.filter(f => (f.severity || '').toLowerCase().includes('critical')).length,
          high: findings.filter(f => (f.severity || '').toLowerCase().includes('high')).length,
          medium: findings.filter(f => (f.severity || '').toLowerCase().includes('medium')).length,
          low: findings.filter(f => (f.severity || '').toLowerCase().includes('low')).length,
          info: findings.filter(f => !['critical', 'high', 'medium', 'low'].some(s => (f.severity || '').toLowerCase().includes(s))).length
        },
        findings: findings.map(f => ({
          title: f.title || f.name || 'Unknown',
          severity: f.severity || 'info',
          location: f.location || f.path || '',
          category: f.category || 'general',
          tool: 'MobSF'
        }))
      };
    }
    
    // Load report2
    if (fs.existsSync(unifiedPath2)) {
      report2 = JSON.parse(fs.readFileSync(unifiedPath2, 'utf8'));
    } else if (fs.existsSync(jsonPath2)) {
      const data = JSON.parse(fs.readFileSync(jsonPath2, 'utf8'));
      // Convert to unified format
      const findings = data.manifest_analysis?.manifest_findings || [];
      report2 = {
        hash: hash2,
        appInfo: {
          name: data.app_name || data.APP_NAME,
          package: data.package_name || data.PACKAGE_NAME,
          version: data.version_name || data.VERSION_NAME
        },
        summary: {
          totalIssues: findings.length,
          critical: findings.filter(f => (f.severity || '').toLowerCase().includes('critical')).length,
          high: findings.filter(f => (f.severity || '').toLowerCase().includes('high')).length,
          medium: findings.filter(f => (f.severity || '').toLowerCase().includes('medium')).length,
          low: findings.filter(f => (f.severity || '').toLowerCase().includes('low')).length,
          info: findings.filter(f => !['critical', 'high', 'medium', 'low'].some(s => (f.severity || '').toLowerCase().includes(s))).length
        },
        findings: findings.map(f => ({
          title: f.title || f.name || 'Unknown',
          severity: f.severity || 'info',
          location: f.location || f.path || '',
          category: f.category || 'general',
          tool: 'MobSF'
        }))
      };
    }
    
    if (!report1 || !report2) {
      return res.status(404).json({ error: 'One or both reports not found' });
    }
    
    const findings1 = report1.findings || [];
    const findings2 = report2.findings || [];
    
    // Create comparison
    const comparison = {
      report1: {
        hash: hash1,
        appInfo: report1.appInfo,
        summary: report1.summary,
        findingsCount: findings1.length
      },
      report2: {
        hash: hash2,
        appInfo: report2.appInfo,
        summary: report2.summary,
        findingsCount: findings2.length
      },
      differences: {
        newFindings: findings2.filter(f2 => 
          !findings1.some(f1 => f1.title === f2.title && f1.location === f2.location)
        ),
        resolvedFindings: findings1.filter(f1 => 
          !findings2.some(f2 => f2.title === f1.title && f2.location === f1.location)
        ),
        changedSeverity: findings1.filter(f1 => {
          const f2 = findings2.find(f => f.title === f1.title && f.location === f1.location);
          return f2 && f2.severity !== f1.severity;
        }).map(f1 => {
          const f2 = findings2.find(f => f.title === f1.title && f.location === f1.location);
          return { ...f1, oldSeverity: f1.severity, newSeverity: f2.severity };
        })
      },
      scoreChange: {
        report1: calculateSecurityScore(report1.summary),
        report2: calculateSecurityScore(report2.summary),
        improvement: calculateSecurityScore(report2.summary) - calculateSecurityScore(report1.summary)
      }
    };
    
    res.json(comparison);
  } catch (err) {
    sendProxyError(res, err);
  }
});

function calculateSecurityScore(summary) {
  const weightedPenalty = (summary.critical * 20) + (summary.high * 10) + 
    (summary.medium * 5) + (summary.low * 2) + (summary.info * 1);
  const maxPenalty = Math.max(summary.totalIssues * 20, 1);
  return Math.max(0, Math.round(100 - (weightedPenalty / maxPenalty) * 100));
}

// ✅ 24. Analytics Dashboard (with caching)
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'analytics_dashboard';
    const cached = cache.getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const jsonFiles = fs.readdirSync(JSON_DIR).filter(f => 
      f.endsWith('.json') && !f.includes('_sonar') && !f.includes('_unified')
    );
    
    const stats = {
      totalReports: jsonFiles.length,
      totalFindings: 0,
      severityBreakdown: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      averageScore: 0,
      scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      recentActivity: [],
      topVulnerabilities: {},
      trendData: []
    };
    
    let totalScore = 0;
    const scores = [];
    
    jsonFiles.forEach(fn => {
      try {
        const hash = path.basename(fn, '.json');
        const reportData = JSON.parse(fs.readFileSync(path.join(JSON_DIR, fn), 'utf8'));
        const stat = fs.statSync(path.join(JSON_DIR, fn));
        
        const findings = reportData.manifest_analysis?.manifest_findings || [];
        stats.totalFindings += findings.length;
        
        findings.forEach(f => {
          const sev = (f.severity || 'info').toLowerCase();
          if (sev.includes('critical')) stats.severityBreakdown.critical++;
          else if (sev.includes('high')) stats.severityBreakdown.high++;
          else if (sev.includes('medium')) stats.severityBreakdown.medium++;
          else if (sev.includes('low')) stats.severityBreakdown.low++;
          else stats.severityBreakdown.info++;
          
          // Track top vulnerabilities
          const title = f.title || 'Unknown';
          stats.topVulnerabilities[title] = (stats.topVulnerabilities[title] || 0) + 1;
        });
        
        // Calculate score
        const score = calculateSecurityScore({
          critical: stats.severityBreakdown.critical,
          high: stats.severityBreakdown.high,
          medium: stats.severityBreakdown.medium,
          low: stats.severityBreakdown.low,
          info: stats.severityBreakdown.info,
          totalIssues: findings.length
        });
        scores.push(score);
        totalScore += score;
        
        // Score distribution
        if (score >= 80) stats.scoreDistribution.excellent++;
        else if (score >= 60) stats.scoreDistribution.good++;
        else if (score >= 40) stats.scoreDistribution.fair++;
        else stats.scoreDistribution.poor++;
        
        // Recent activity
        stats.recentActivity.push({
          hash,
          appName: reportData.app_name || reportData.APP_NAME,
          timestamp: stat.mtime,
          score
        });
        
        // Trend data
        stats.trendData.push({
          date: stat.mtime,
          score,
          findings: findings.length
        });
      } catch (e) {
        console.error(`Error processing ${fn}:`, e.message);
      }
    });
    
    stats.averageScore = jsonFiles.length > 0 ? Math.round(totalScore / jsonFiles.length) : 0;
    stats.recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    stats.trendData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Top 10 vulnerabilities
    stats.topVulnerabilities = Object.entries(stats.topVulnerabilities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
    
    // Cache the result for 5 minutes
    cache.setCache(cacheKey, stats, 300000);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================

// ✅ 25. Get Notifications Config (optional auth - allow without login)
app.get('/api/notifications/config', (req, res) => {
  try {
    const config = notifications.loadNotificationsConfig();
    // Don't send password or API key
    const safeConfig = {
      ...config,
      email: {
        ...config.email,
        smtp: {
          ...config.email.smtp,
          auth: {
            user: config.email.smtp.auth.user,
            pass: '***' // Hide password
          }
        }
      },
      emailService: {
        ...config.emailService,
        sendgridApiKey: config.emailService?.sendgridApiKey ? '***' : '' // Hide API key
      }
    };
    res.json(safeConfig);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 26. Update Notifications Config (optional auth)
app.post('/api/notifications/config', (req, res) => {
  try {
    const config = notifications.loadNotificationsConfig();
    const updates = req.body;
    
    // Merge updates
    if (updates.email) {
      config.email = { ...config.email, ...updates.email };
      // If password is '***', keep the existing password
      if (updates.email.smtp?.auth?.pass === '***') {
        const existing = notifications.loadNotificationsConfig();
        config.email.smtp.auth.pass = existing.email.smtp.auth.pass;
      }
    }
    if (updates.alerts) {
      config.alerts = { ...config.alerts, ...updates.alerts };
    }
    if (updates.emailService) {
      config.emailService = { 
        type: updates.emailService.type || config.emailService?.type || 'smtp',
        sendgridApiKey: updates.emailService.sendgridApiKey === '***' 
          ? (config.emailService?.sendgridApiKey || '')
          : (updates.emailService.sendgridApiKey || config.emailService?.sendgridApiKey || '')
      };
    }
    
    notifications.saveNotificationsConfig(config);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 27. Test Email Configuration (optional auth)
app.post('/api/notifications/test-email', async (req, res) => {
  try {
    const result = await notifications.testEmailConfig();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 28. Send Notification (optional auth)
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { subject, html, text } = req.body;
    const result = await notifications.sendEmailNotification(subject, html, text);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

// ✅ 29. Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    if (!username || !password) {
      return res.status(422).json({ error: 'Username and password required' });
    }
    const result = auth.createUser(username, password, email, role);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 30. Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(422).json({ error: 'Username and password required' });
    }
    const result = auth.authenticateUser(username, password);
    if (!result.success) {
      return res.status(401).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 31. Verify Token
app.get('/api/auth/verify', auth.requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ✅ 32. Change Password
app.post('/api/auth/change-password', auth.requireAuth, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(422).json({ error: 'Old and new password required' });
    }
    const result = auth.changePassword(req.user.username, oldPassword, newPassword);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 33. Get All Users (Admin)
app.get('/api/auth/users', auth.requireAuth, auth.requireAdmin, (req, res) => {
  try {
    const users = auth.getAllUsers();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// SEND REPORT VIA EMAIL
// ============================================

// ✅ 30. Send Specific Report via Email
app.post('/api/notifications/send-report', async (req, res) => {
  try {
    const { hash } = req.body;
    if (!hash) {
      return res.status(400).json({ success: false, error: 'Report hash is required' });
    }

    // Load the report
    const unifiedPath = path.join(JSON_DIR, `${hash}_unified.json`);
    let reportData = null;
    let appName = 'Unknown';
    let score = 0;
    let findings = [];

    if (fs.existsSync(unifiedPath)) {
      reportData = JSON.parse(fs.readFileSync(unifiedPath, 'utf8'));
      appName = reportData.appInfo?.name || reportData.APP_NAME || 'Unknown';
      score = reportData.securityScore || reportData.security_score || 0;
      findings = reportData.findings || [];
    } else {
      // Try to load from regular JSON
      const jsonPath = path.join(JSON_DIR, `${hash}.json`);
      if (fs.existsSync(jsonPath)) {
        reportData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        appName = reportData.APP_NAME || reportData.app_name || 'Unknown';
        score = reportData.securityScore || reportData.security_score || 0;
        findings = reportData.manifest_analysis?.manifest_findings || [];
      } else {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
    }

    // Send email notification with report
    await notifications.notifyScanComplete(hash, appName, score, findings);
    
    res.json({ 
      success: true, 
      message: 'Report sent successfully',
      report: {
        hash,
        appName,
        score
      }
    });
  } catch (err) {
    console.error('Error sending report:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// SHAREABLE LINKS ENDPOINTS
// ============================================

// ✅ 38. Generate Shareable Link (optional auth)
app.post('/api/reports/:hash/share', (req, res) => {
  try {
    const { hash } = req.params;
    const { expiresAt, maxViews, password } = req.body;
    const baseUrl = req.headers.origin || 'http://localhost:3000';
    
    const link = shareableLinks.generateShareableLink(hash, {
      expiresAt,
      maxViews,
      password,
      createdBy: req.user?.username || 'anonymous',
      baseUrl
    });
    
    res.json({ success: true, link });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 39. Access Shareable Link (Public)
app.get('/api/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.query;
    
    const result = shareableLinks.accessShareableLink(token, password);
    
    if (!result.success) {
      if (result.requiresPassword) {
        return res.status(401).json({ ...result, requiresPassword: true });
      }
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 40. Get Link Info
app.get('/api/shared/:token/info', (req, res) => {
  try {
    const { token } = req.params;
    const info = shareableLinks.getLinkInfo(token);
    if (!info) {
      return res.status(404).json({ error: 'Link not found' });
    }
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 41. Revoke Shareable Link (optional auth)
app.delete('/api/shared/:token', (req, res) => {
  try {
    const { token } = req.params;
    const result = shareableLinks.revokeShareableLink(token);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 42. Get All Links for Report (optional auth)
app.get('/api/reports/:hash/links', (req, res) => {
  try {
    const { hash } = req.params;
    const links = shareableLinks.getLinksForHash(hash);
    res.json({ links });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CACHE MANAGEMENT ENDPOINTS
// ============================================

// ✅ 43. Get Cache Stats
app.get('/api/cache/stats', auth.requireAuth, auth.requireAdmin, (req, res) => {
  try {
    const stats = cache.getCacheStats();
    const config = cache.getCacheConfig();
    res.json({ stats, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 44. Clear Cache
app.post('/api/cache/clear', auth.requireAuth, auth.requireAdmin, (req, res) => {
  try {
    const { key } = req.body;
    cache.clearCache(key);
    res.json({ success: true, message: key ? 'Cache entry cleared' : 'All cache cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// INTEGRATE NOTIFICATIONS INTO SCAN COMPLETION
// ============================================

// Hook into scan completion to send notifications
// This will be called after scan completes
async function notifyOnScanComplete(hash, reportData) {
  try {
    const findings = reportData.manifest_analysis?.manifest_findings || [];
    const criticalFindings = findings.filter(f => 
      (f.severity || '').toLowerCase().includes('critical')
    );
    
    // Calculate score
    const weightedPenalty = findings.reduce((sum, f) => {
      const sev = (f.severity || 'info').toLowerCase();
      if (sev.includes('critical')) return sum + 20;
      if (sev.includes('high')) return sum + 10;
      if (sev.includes('medium')) return sum + 5;
      if (sev.includes('low')) return sum + 2;
      return sum + 1;
    }, 0);
    const score = Math.max(0, Math.round(100 - (weightedPenalty / Math.max(findings.length * 20, 1)) * 100));
    
    // Notify scan complete
    await notifications.notifyScanComplete(
      hash,
      reportData.app_name || reportData.APP_NAME,
      score,
      findings
    );
    
    // Notify critical vulnerabilities if any
    if (criticalFindings.length > 0) {
      await notifications.notifyCriticalVulnerability(
        hash,
        reportData.app_name || reportData.APP_NAME,
        criticalFindings
      );
    }
  } catch (err) {
    console.error('Notification error:', err);
  }
}

// ✅ Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend proxy running on port ${PORT}`);
});
