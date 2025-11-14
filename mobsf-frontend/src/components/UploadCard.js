// src/components/UploadCard.js
// Replace your file with this (or patch the saveAndNotify logic)
import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, ProgressBar, Form, Badge } from 'react-bootstrap';
import { uploadFile, triggerScan, getScanLogs, saveJsonReport, getReportJSON, runSonarQube } from '../api';

export default function UploadCard({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | uploaded | scanning | running-tools | ready | error
  const [message, setMessage] = useState('');
  const [hash, setHash] = useState(null);
  const [runAllTools, setRunAllTools] = useState(true); // Default to run all tools
  const [selectedTools, setSelectedTools] = useState({
    mobsf: true,
    sonar: true
  });
  const pollRef = useRef(null);
  const errorCountRef = useRef(0);
  const backoffRef = useRef(5000);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const startPolling = (h) => {
    if (pollRef.current) clearInterval(pollRef.current);
    errorCountRef.current = 0;
    backoffRef.current = 5000;

    const readyKeywords = [
      'generating report','generation complete','completed','finished',
      'saving to database','saved to database','report generated',
      'saving results','saving to db'
    ];

    async function pollOnce() {
      try {
        const r = await getScanLogs(h);
        const logs = r.data.logs || [];
        const joined = JSON.stringify(logs).toLowerCase();

        const isReady = readyKeywords.some(k => joined.includes(k));
        if (isReady) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setStatus('ready');
          setMessage('MobSF scan complete.');
          
          // Save MobSF JSON
          try {
            await saveJsonReport(h);
          } catch (e) {
            console.error('saveJsonReport error', e?.response?.data || e?.message || e);
          }
          
          // Run additional tools based on selection
          if (runAllTools || selectedTools.lint || selectedTools.sonar) {
            await runAdditionalTools(h);
          } else {
            onUploaded && onUploaded({ hash: h });
          }
          return;
        }

        // fallback probe
        try {
          const probe = await getReportJSON(h);
          if (probe?.status === 200 && probe?.data) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setStatus('ready');
            setMessage('Scan complete.');
            try { await saveJsonReport(h); } catch(e){ console.error('saveJsonReport error', e); }
            onUploaded && onUploaded({ hash: h });
            return;
          }
        } catch (probeErr) {
          // ignore
        }

        setStatus('scanning');
        const last = logs.length ? logs[logs.length - 1] : null;
        if (last && last.status) setMessage(`${last.timestamp || ''} — ${last.status}`);
        else setMessage('Scanning... (waiting for logs)');
        errorCountRef.current = 0;
        backoffRef.current = 5000;
      } catch (err) {
        console.error('scan_logs polling error:', err?.response?.status, err?.response?.data || err?.message || err);
        // fallback probe attempt
        try {
          const probe = await getReportJSON(h);
          if (probe?.status === 200 && probe?.data) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setStatus('ready');
            setMessage('Scan complete.');
            try { await saveJsonReport(h); } catch(e){ console.error('saveJsonReport error', e); }
            onUploaded && onUploaded({ hash: h });
            return;
          }
        } catch (probeErr) {
          console.warn('report_json probe failed:', probeErr?.response?.data || probeErr?.message || probeErr);
        }

        errorCountRef.current += 1;
        if (errorCountRef.current >= 6) {
          setMessage('Temporary connection problems fetching logs. Will keep checking in background.');
        } else {
          setMessage('Polling logs... (temporary error, retrying)');
        }
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = setInterval(pollOnce, backoffRef.current);
          backoffRef.current = Math.min(backoffRef.current * 1.8, 60000);
        }
      }
    }

    pollOnce();
    pollRef.current = setInterval(pollOnce, backoffRef.current);
  };

  // Run additional analysis tools
  const runAdditionalTools = async (h) => {
    setStatus('running-tools');
    const toolsToRun = [];
    
    if (runAllTools) {
      toolsToRun.push({ name: 'SonarQube', fn: () => runSonarQube(h) });
    } else {
      if (selectedTools.sonar) toolsToRun.push({ name: 'SonarQube', fn: () => runSonarQube(h) });
    }

    for (const tool of toolsToRun) {
      try {
        setMessage(`Running ${tool.name}...`);
        await tool.fn();
        setMessage(`${tool.name} complete.`);
      } catch (err) {
        console.error(`${tool.name} error:`, err);
        setMessage(`${tool.name} failed (continuing...)`);
      }
    }

    setStatus('ready');
    setMessage('All analysis complete!');
    onUploaded && onUploaded({ hash: h });
  };

  const handleUpload = async () => {
    if (!file) return setMessage('Choose an APK first.');
    setStatus('uploading'); setProgress(2); setMessage('Uploading...');
    try {
      const res = await uploadFile(file, (pe) => setProgress(Math.round((pe.loaded * 100) / pe.total)));
      const h = res.data.hash || res.data.MD5 || res.data.md5;
      setHash(h);
      setStatus('uploaded');
      setMessage('Uploaded — hash: ' + h);
      setStatus('scanning');
      await triggerScan(h);
      setMessage('MobSF scan triggered — polling logs...');
      startPolling(h);
    } catch (err) {
      console.error('upload error:', err?.response?.status, err?.response?.data || err?.message || err);
      setStatus('error');
      const errMsg = err?.response?.data?.error || err?.message || 'Upload failed';
      setMessage(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    }
  };

  const toggleTool = (tool) => {
    if (runAllTools) return; // Can't toggle when "Run All" is selected
    setSelectedTools(prev => ({ ...prev, [tool]: !prev[tool] }));
  };

  const handleRunAllToggle = (value) => {
    setRunAllTools(value);
    if (value) {
      setSelectedTools({ mobsf: true, sonar: true });
    }
  };

  return (
    <Card className="mb-3 shadow-sm" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="mb-1">📤 Upload & Analyze APK</h5>
            <small className="text-muted">
              Status: 
              <Badge 
                bg={
                  status === 'ready' ? 'success' : 
                  status === 'error' ? 'danger' : 
                  status === 'running-tools' ? 'info' :
                  status === 'scanning' ? 'warning' :
                  'secondary'
                }
                className="ms-1"
              >
                {status === 'running-tools' ? '⏳ Running Tools' : 
                 status === 'scanning' ? '🔍 Scanning' :
                 status === 'uploading' ? '⬆️ Uploading' :
                 status === 'ready' ? '✅ Ready' :
                 status === 'error' ? '❌ Error' :
                 '⏸️ Idle'
                }
              </Badge>
            </small>
          </div>
        </div>

        <Form.Group controlId="fileInput" className="mb-3">
          <Form.Label>Select APK File</Form.Label>
          <Form.Control type="file" accept=".apk,.zip,.xapk,.apks" onChange={handleChange} />
        </Form.Group>

        {/* Tool Selection */}
        <Card className="mb-3" style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}>
          <Card.Body className="py-2">
            <div className="mb-2">
              <strong className="small">Analysis Tools:</strong>
            </div>
            <div className="d-flex flex-column gap-2">
              <Form.Check 
                type="radio"
                id="run-all-tools"
                label="🚀 Run All Tools (MobSF + SonarQube)"
                checked={runAllTools}
                onChange={() => handleRunAllToggle(true)}
              />
              <Form.Check 
                type="radio"
                id="select-tools"
                label="⚙️ Select Specific Tools"
                checked={!runAllTools}
                onChange={() => handleRunAllToggle(false)}
              />
              
              {!runAllTools && (
                <div className="ms-4 mt-2" style={{ borderLeft: '3px solid #667eea', paddingLeft: 12 }}>
                  <Form.Check 
                    type="checkbox"
                    id="tool-mobsf"
                    label="📱 MobSF (Always runs)"
                    checked={true}
                    disabled={true}
                  />
                  <Form.Check 
                    type="checkbox"
                    id="tool-sonar"
                    label="🟣 SonarQube"
                    checked={selectedTools.sonar}
                    onChange={() => toggleTool('sonar')}
                  />
                </div>
              )}
            </div>
          </Card.Body>
        </Card>

        <div className="d-flex gap-2">
          <Button variant="primary" onClick={handleUpload} disabled={!file || status === 'uploading' || status === 'scanning' || status === 'running-tools'}>
            {status === 'uploading' ? 'Uploading…' : status === 'scanning' ? 'Scanning...' : status === 'running-tools' ? 'Running Tools...' : 'Upload & Analyze'}
          </Button>
          <Button variant="outline-secondary" onClick={() => { setFile(null); setProgress(0); setMessage(''); setHash(null); }}>
            Reset
          </Button>
        </div>

        <div className="mt-3">
          {(status === 'uploading' || status === 'scanning' || status === 'running-tools') && (
            <ProgressBar 
              now={status === 'uploading' ? progress : status === 'scanning' ? 50 : 75} 
              label={status === 'uploading' ? `${progress}%` : status === 'scanning' ? 'Scanning...' : 'Running tools...'} 
              animated={true}
              striped
              variant={status === 'running-tools' ? 'success' : 'info'}
            />
          )}
          {message && <div className="mt-2 text-break" style={{ whiteSpace: 'pre-wrap' }}>
            <small>{message}</small>
          </div>}
          {hash && <div className="small text-muted mt-1">Hash: {hash}</div>}
          
          {runAllTools && file && (
            <div className="mt-2">
              <Badge bg="info" className="me-1">Auto-run enabled</Badge>
              <small className="text-muted">All tools will run automatically after upload</small>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
