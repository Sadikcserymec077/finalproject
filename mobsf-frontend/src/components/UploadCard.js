// src/components/UploadCard.js
// Replace your file with this (or patch the saveAndNotify logic)
import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, ProgressBar, Form, Badge } from 'react-bootstrap';
import { uploadFile, triggerScan, getScanLogs, saveJsonReport, getReportJSON } from '../api';

export default function UploadCard({ onUploaded }) {
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null); // Keep for backward compatibility
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | uploaded | scanning | ready | error
  const [message, setMessage] = useState('');
  const [hash, setHash] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const pollRef = useRef(null);
  const errorCountRef = useRef(0);
  const backoffRef = useRef(5000);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      setFile(selectedFiles[0]); // Keep first file for backward compatibility
      setMessage('');
    }
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
          
          // Analysis complete
          onUploaded && onUploaded({ hash: h });
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

  // Analysis complete - no additional tools needed

  const handleUpload = async () => {
    if (!files || files.length === 0) return setMessage('Choose an APK file(s) first.');
    
    // Single file upload (backward compatible)
    if (files.length === 1) {
      setStatus('uploading'); setProgress(2); setMessage('Uploading...');
      try {
        const res = await uploadFile(files[0], (pe) => setProgress(Math.round((pe.loaded * 100) / pe.total)));
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
      return;
    }

    // Multiple files upload - process sequentially
    setStatus('uploading');
    setMessage(`Uploading ${files.length} files...`);
    setUploadQueue(files.map((f, idx) => ({ file: f, index: idx, status: 'pending', hash: null })));
    setCurrentUploadIndex(0);
    
    // Process files sequentially
    for (let i = 0; i < files.length; i++) {
      setCurrentUploadIndex(i);
      setMessage(`Uploading ${i + 1}/${files.length}: ${files[i].name}...`);
      setProgress(Math.round(((i) / files.length) * 100));
      
      try {
        const res = await uploadFile(files[i], (pe) => {
          const fileProgress = Math.round((pe.loaded * 100) / pe.total);
          const overallProgress = Math.round(((i + (fileProgress / 100)) / files.length) * 100);
          setProgress(overallProgress);
        });
        
        const h = res.data.hash || res.data.MD5 || res.data.md5;
        
        // Update queue
        setUploadQueue(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'uploaded', hash: h } : item
        ));
        
        // Trigger scan for this file
        setMessage(`Scanning ${i + 1}/${files.length}: ${files[i].name}...`);
        await triggerScan(h);
        
        // Save report
        try {
          await saveJsonReport(h);
        } catch (e) {
          console.error('saveJsonReport error', e);
        }
        
        // Notify parent for each completed file
        if (onUploaded) {
          onUploaded({ hash: h, filename: files[i].name, index: i, total: files.length });
        }
        
      } catch (err) {
        console.error(`Upload error for ${files[i].name}:`, err);
        setUploadQueue(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'error', error: err?.response?.data?.error || err?.message } : item
        ));
      }
    }
    
    setProgress(100);
    setStatus('ready');
    setMessage(`✅ Completed uploading ${files.length} file(s)`);
  };


  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(droppedFiles);
      setFile(droppedFiles[0]); // Keep first file for backward compatibility
      setMessage('');
    }
  };

  return (
    <Card className="mb-3 shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h5 className="mb-2" style={{ fontWeight: 700, fontSize: '1.3rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '8px' }}>📤</span>
              Upload & Analyze APK
            </h5>
            <small className="text-muted d-flex align-items-center">
              Status: 
              <Badge 
                bg={
                  status === 'ready' ? 'success' : 
                  status === 'error' ? 'danger' : 
                  status === 'running-tools' ? 'info' :
                  status === 'scanning' ? 'warning' :
                  'secondary'
                }
                className="ms-2"
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }}
              >
                {status === 'scanning' ? '🔍 Scanning' :
                 status === 'uploading' ? '⬆️ Uploading' :
                 status === 'ready' ? '✅ Ready' :
                 status === 'error' ? '❌ Error' :
                 '⏸️ Idle'
                }
              </Badge>
            </small>
          </div>
        </div>

        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? '#667eea' : 'var(--border-color)'}`,
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center',
            background: isDragging ? 'rgba(102, 126, 234, 0.05)' : 'var(--bg-secondary)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            marginBottom: '1.5rem'
          }}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {isDragging ? '📥' : '📁'}
          </div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1.1rem' }}>
            {isDragging ? 'Drop your APK file here' : 'Drag & Drop or Click to Select'}
          </div>
          <div className="text-muted small">
            Supports: .apk, .zip, .xapk, .apks files
            <br />
            <strong>💡 Tip:</strong> Hold Ctrl/Cmd to select multiple files
          </div>
          <Form.Control 
            id="fileInput"
            type="file" 
            accept=".apk,.zip,.xapk,.apks" 
            multiple
            onChange={handleChange} 
            style={{ 
              display: 'none',
              background: 'var(--bg-secondary)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '0.75rem'
            }} 
          />
          {files.length > 0 && (
            <div className="mt-3">
              {files.length === 1 ? (
                <Badge bg="info" style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>
                  📄 {files[0].name}
                </Badge>
              ) : (
                <div>
                  <Badge bg="info" style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', marginBottom: '8px' }}>
                    📦 {files.length} files selected
                  </Badge>
                  <div style={{ marginTop: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                    {files.map((f, idx) => (
                      <div key={idx} className="small text-muted" style={{ padding: '4px 0' }}>
                        {idx + 1}. {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>


        <div className="d-flex gap-2">
          <Button 
            variant="primary" 
            onClick={handleUpload} 
            disabled={files.length === 0 || status === 'uploading' || status === 'scanning'} 
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '0.6rem 1.5rem',
              fontWeight: 600,
              fontSize: '1rem',
              flex: 1,
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
          >
            {status === 'uploading' ? `⬆️ Uploading ${files.length > 1 ? `${currentUploadIndex + 1}/${files.length}…` : '…'}` : 
             status === 'scanning' ? '🔍 Scanning...' : 
             files.length > 1 ? `🚀 Upload & Analyze ${files.length} Files` : '🚀 Upload & Analyze'}
          </Button>
          <Button 
            variant="outline-secondary" 
            onClick={() => { 
              setFiles([]); 
              setFile(null); 
              setProgress(0); 
              setMessage(''); 
              setHash(null); 
              setStatus('idle'); 
              setUploadQueue([]);
              setCurrentUploadIndex(0);
            }} 
            style={{ 
              borderColor: 'var(--border-color)', 
              color: 'var(--text-primary)',
              borderRadius: '12px',
              padding: '0.6rem 1.5rem',
              fontWeight: 600
            }}
          >
            🔄 Reset
          </Button>
        </div>

        <div className="mt-4">
          {(status === 'uploading' || status === 'scanning') && (
            <div>
              <ProgressBar 
                now={status === 'uploading' ? progress : 50} 
                label={status === 'uploading' ? `${progress}%` : 'Scanning...'} 
                animated={true}
                striped
                variant="info"
                style={{ 
                  height: '12px',
                  borderRadius: '10px',
                  marginBottom: '0.5rem',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
              <div className="text-center">
                <small className="text-muted" style={{ fontWeight: 500 }}>
                  {status === 'uploading' ? `Uploading file... ${progress}%` : 
                   '🔍 Analyzing security vulnerabilities...'}
                </small>
              </div>
            </div>
          )}
          {message && (
            <div className="mt-3 p-3 text-break" style={{ 
              whiteSpace: 'pre-wrap',
              background: status === 'error' ? 'rgba(220, 53, 69, 0.1)' : 'rgba(13, 202, 240, 0.1)',
              borderRadius: '12px',
              border: `1px solid ${status === 'error' ? 'rgba(220, 53, 69, 0.3)' : 'rgba(13, 202, 240, 0.3)'}`
            }}>
              <small style={{ fontWeight: 500 }}>{message}</small>
            </div>
          )}
          {hash && (
            <div className="mt-3 p-2" style={{ 
              background: 'var(--bg-secondary)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}>
              <div className="small text-muted">
                <strong>Hash:</strong> <code style={{ fontSize: '0.85rem' }}>{hash}</code>
              </div>
            </div>
          )}
          
        </div>
      </Card.Body>
    </Card>
  );
}
