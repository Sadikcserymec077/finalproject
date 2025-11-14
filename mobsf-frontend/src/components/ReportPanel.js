// src/components/ReportPanel.js
import React, { useState, useEffect } from "react";
import { Card, Button, Badge, ButtonGroup, Spinner, Alert, Tabs, Tab } from "react-bootstrap";
import { savePdfReport, saveJsonReport, getReportJSON, runSonarQube, getUnifiedReport } from "../api";
import HumanReport from "./HumanReport";
import DetailedReport from "./DetailedReport";

export default function ReportPanel({ hash, initialJsonPath }) {
  const [report, setReport] = useState(null);
  const [unifiedReport, setUnifiedReport] = useState(null);
  const [jsonPath, setJsonPath] = useState(initialJsonPath || null);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [msg, setMsg] = useState("");
  const [viewMode, setViewMode] = useState("none"); // 'none' | 'json' | 'pdf' | 'unified' | 'raw'
  const [analysisStatus, setAnalysisStatus] = useState({
    mobsf: false,
    sonar: false
  });
  const [rawReports, setRawReports] = useState({
    mobsf: null,
    sonar: null
  });

  useEffect(() => {
    // Reset when hash changes
    setReport(null);
    setUnifiedReport(null);
    setJsonPath(initialJsonPath || null);
    setPdfUrl(null);
    setMsg("");
    setViewMode("none");
    setAnalysisStatus({ mobsf: false, sonar: false });

    if (!hash) return;

    // Auto-load saved JSON report when a new hash is selected
    (async () => {
      setLoading(true);
      setMsg("Loading MobSF report...");
      try {
        const r = await saveJsonReport(hash);
        const payload = r.data.data || r.data;
        setReport(payload);
        setJsonPath(r.data.path || `/reports/json/${hash}`);
        setAnalysisStatus(prev => ({ ...prev, mobsf: true }));
        setViewMode("json");
        setMsg("MobSF report loaded. Run additional analysis for comprehensive results.");
      } catch (e) {
        // fallback to GET proxy
        try {
          const r2 = await getReportJSON(hash);
          setReport(r2.data);
          setAnalysisStatus(prev => ({ ...prev, mobsf: true }));
          setViewMode("json");
          setMsg("MobSF report loaded (fallback). Run additional analysis for comprehensive results.");
        } catch (e2) {
          setMsg("Failed to load MobSF report: " + (e2?.response?.data || e2?.message || e?.message));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [hash, initialJsonPath]);

  // Run SonarQube Analysis
  const handleRunSonar = async () => {
    if (!hash) { setMsg("No hash selected"); return; }
    setLoading(true);
    setMsg("Running SonarQube analysis...");
    try {
      await runSonarQube(hash);
      setAnalysisStatus(prev => ({ ...prev, sonar: true }));
      setMsg("SonarQube analysis complete!");
    } catch (e) {
      setMsg("SonarQube failed: " + (e?.response?.data?.error || e?.message));
    } finally {
      setLoading(false);
    }
  };

  // Run All Tools
  const handleRunAllTools = async () => {
    if (!hash) { setMsg("No hash selected"); return; }
    setLoading(true);
    
    try {
      // Run sonar
      setMsg("Running SonarQube...");
      await runSonarQube(hash);
      setAnalysisStatus(prev => ({ ...prev, sonar: true }));
      
      setMsg("All tools completed! Loading unified report...");
      
      // Load unified report
      setTimeout(() => handleShowUnified(), 500);
    } catch (e) {
      setMsg("Multi-tool analysis error: " + (e?.response?.data?.error || e?.message));
    } finally {
      setLoading(false);
    }
  };

  // Show Unified Report
  const handleShowUnified = async () => {
    if (!hash) { setMsg("No hash selected"); return; }
    setLoading(true);
    setMsg("Generating unified report from all tools...");
    try {
      const r = await getUnifiedReport(hash);
      setUnifiedReport(r.data);
      
      // Store raw reports from unified data
      if (r.data.rawReports) {
        setRawReports(r.data.rawReports);
      }
      
      setViewMode("unified");
      setMsg("Unified report loaded successfully!");
    } catch (e) {
      setMsg("Failed to load unified report: " + (e?.response?.data?.error || e?.message));
    } finally {
      setLoading(false);
    }
  };

  // Show Raw JSON Reports
  const handleShowRawJSON = async () => {
    if (!hash) { setMsg("No hash selected"); return; }
    setLoading(true);
    setMsg("Loading raw JSON reports from all tools...");
    try {
      // Load unified report to get raw data
      const r = await getUnifiedReport(hash);
      if (r.data.rawReports) {
        setRawReports(r.data.rawReports);
        setViewMode("raw");
        setMsg("Raw JSON reports loaded!");
      } else {
        setMsg("Raw reports not available. Run analysis first.");
      }
    } catch (e) {
      console.error('Raw JSON error:', e);
      setMsg("Failed to load raw reports: " + (e?.response?.data?.error || e?.message));
    } finally {
      setLoading(false);
    }
  };

  // Explicit Summary button handler (reloads JSON and shows human report)
  const handleShowSummary = async () => {
    if (!hash) { setMsg("No hash selected"); return; }
    setLoading(true);
    setMsg("Loading summary...");
    try {
      const r = await saveJsonReport(hash);
      const payload = r.data.data || r.data;
      setReport(payload);
      setJsonPath(r.data.path || `/reports/json/${hash}`);
      setViewMode("json");
      setMsg("");
    } catch (e) {
      // fallback to GET proxy
      try {
        const r2 = await getReportJSON(hash);
        setReport(r2.data);
        setViewMode("json");
        setMsg("");
      } catch (e2) {
        setMsg("Failed to load summary: " + (e2?.response?.data || e2?.message || e?.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (!hash) { setMsg("No hash selected"); return; }
    setLoading(true); setMsg("Fetching PDF...");
    try {
      const r = await savePdfReport(hash); // blob
      const blob = new Blob([r.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setViewMode("pdf");
      setMsg("PDF preview loaded below.");
    } catch (e) {
      setMsg("PDF fetch failed: " + (e?.response?.data || e?.message));
    } finally { setLoading(false); }
  };

  const handleDownloadPdf = async () => {
    if (!hash) { setMsg("No hash selected"); return; }
    setMsg("Preparing PDF for download...");
    try {
      const r = await savePdfReport(hash);
      const blob = new Blob([r.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${hash}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg("Download started.");
    } catch (e) {
      setMsg("Download failed: " + (e?.response?.data || e?.message));
    }
  };

  const closePdf = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setViewMode("none");
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <Card.Title className="mb-2">📊 Analysis Report</Card.Title>
            <div className="text-muted">Hash: <Badge bg="light" text="dark">{hash || "none"}</Badge></div>
            <div className="mt-2">
              <small className="me-3">
                {analysisStatus.mobsf ? <Badge bg="success">✓ MobSF</Badge> : <Badge bg="secondary">○ MobSF</Badge>}
              </small>
              <small>
                {analysisStatus.sonar ? <Badge bg="success">✓ SonarQube</Badge> : <Badge bg="secondary">○ SonarQube</Badge>}
              </small>
            </div>
          </div>

          <div className="text-end">
            <div className="mb-2">
              <ButtonGroup size="sm">
                <Button variant="outline-primary" onClick={handleRunSonar} disabled={!hash || loading || analysisStatus.sonar}>
                  {analysisStatus.sonar ? "✓" : ""} SonarQube
                </Button>
                <Button variant="success" onClick={handleRunAllTools} disabled={!hash || loading}>
                  🚀 Run All
                </Button>
              </ButtonGroup>
            </div>
            <div>
              <ButtonGroup size="sm" className="mb-2">
                <Button variant="outline-secondary" onClick={handleShowSummary} disabled={!hash || loading}>
                  MobSF Summary
                </Button>
                <Button variant="primary" onClick={handleShowUnified} disabled={!hash || loading}>
                  📑 Unified Report
                </Button>
                <Button variant="info" onClick={handleShowRawJSON} disabled={!hash || loading}>
                  📄 Raw JSON
                </Button>
              </ButtonGroup>
              <div>
                <ButtonGroup size="sm">
                  <Button variant="warning" onClick={handlePreviewPDF} disabled={!hash || loading}>
                    PDF Preview
                  </Button>
                  <Button variant="success" onClick={handleDownloadPdf} disabled={!hash || loading}>
                    Download PDF
                  </Button>
                </ButtonGroup>
                {viewMode === 'pdf' && <Button variant="outline-danger" size="sm" onClick={closePdf} className="ms-2">Close PDF</Button>}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <Alert variant="info" className="d-flex align-items-center py-2">
            <Spinner animation="border" size="sm" className="me-2" />
            {msg}
          </Alert>
        )}
        
        {!loading && msg && <Alert variant="info" className="py-2">{msg}</Alert>}

        {/* Show the unified detailed report (all tools merged) */}
        {viewMode === 'unified' && unifiedReport && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Badge bg="primary">Multi-Tool Analysis</Badge>
              <small className="ms-2 text-muted">Combined findings from MobSF, Android Lint, and SonarQube</small>
            </div>
            <DetailedReport data={unifiedReport} />
          </div>
        )}

        {/* Show the MobSF-only human-friendly report */}
        {viewMode === 'json' && report && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Badge bg="danger">MobSF Only</Badge>
              {jsonPath && <small className="ms-2">Saved JSON: <a href={jsonPath} target="_blank" rel="noreferrer">{jsonPath}</a></small>}
            </div>
            <HumanReport data={report} />
          </div>
        )}

        {/* PDF preview */}
        {viewMode === 'pdf' && pdfUrl && (
          <div>
            <iframe title="report-pdf" src={pdfUrl} style={{ width: '100%', height: 640, border: '1px solid #ddd', borderRadius: 6 }} />
          </div>
        )}

        {/* Raw JSON Reports View */}
        {viewMode === 'raw' && (
          <div>
            <div className="mb-3">
              <Badge bg="dark">Raw JSON Reports</Badge>
              <small className="ms-2 text-muted">View original JSON output from each tool</small>
            </div>
            
            <Tabs defaultActiveKey="mobsf" className="mb-3">
              <Tab eventKey="mobsf" title={`🔴 MobSF ${rawReports.mobsf ? '✓' : '✗'}`}>
                <Card className="shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6>MobSF Report JSON</h6>
                      {rawReports.mobsf && (
                        <Button 
                          size="sm" 
                          variant="outline-primary"
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(rawReports.mobsf, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${hash}_mobsf.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          💾 Download JSON
                        </Button>
                      )}
                    </div>
                    {rawReports.mobsf ? (
                      <div>
                        <div className="mb-2 text-muted small">
                          <strong>File size:</strong> {JSON.stringify(rawReports.mobsf).length} characters | 
                          <strong> Keys:</strong> {Object.keys(rawReports.mobsf).length}
                        </div>
                        <pre style={{ 
                          background: '#f8f9fa', 
                          padding: 15, 
                          borderRadius: 8, 
                          maxHeight: 500, 
                          overflow: 'auto',
                          fontSize: 11,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all'
                        }}>
                          {JSON.stringify(rawReports.mobsf, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <Alert variant="warning">MobSF report not available. Run scan first.</Alert>
                    )}
                  </Card.Body>
                </Card>
              </Tab>
              
              <Tab eventKey="sonar" title={`🟣 SonarQube ${rawReports.sonar ? '✓' : '✗'}`}>
                <Card className="shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6>SonarQube Report JSON</h6>
                      {rawReports.sonar && (
                        <Button 
                          size="sm" 
                          variant="outline-info"
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(rawReports.sonar, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${hash}_sonar.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          💾 Download JSON
                        </Button>
                      )}
                    </div>
                    {rawReports.sonar ? (
                      <div>
                        <div className="mb-2 text-muted small">
                          <strong>Vulnerabilities:</strong> {rawReports.sonar.measures?.vulnerabilities || 0} | 
                          <strong> Code Smells:</strong> {rawReports.sonar.measures?.code_smells || 0} |
                          <strong> Security:</strong> {rawReports.sonar.measures?.security_rating || 'N/A'}
                        </div>
                        <pre style={{ 
                          background: '#e7f3ff', 
                          padding: 15, 
                          borderRadius: 8, 
                          maxHeight: 500, 
                          overflow: 'auto',
                          fontSize: 11,
                          whiteSpace: 'pre-wrap'
                        }}>
                          {JSON.stringify(rawReports.sonar, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <Alert variant="warning">SonarQube report not available. Click "SonarQube" button to run analysis.</Alert>
                    )}
                  </Card.Body>
                </Card>
              </Tab>
              
              <Tab eventKey="combined" title={`📊 Combined Data ${rawReports.mobsf && rawReports.sonar ? '✓' : '✗'}`}>
                <Card className="shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6>Combined Reports JSON</h6>
                      {(rawReports.mobsf && rawReports.sonar) && (
                        <Button 
                          size="sm" 
                          variant="outline-primary"
                          onClick={() => {
                            const combinedData = {
                              mobsf: rawReports.mobsf,
                              sonarqube: rawReports.sonar
                            };
                            const blob = new Blob([JSON.stringify(combinedData, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${hash}_combined.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          💾 Download JSON
                        </Button>
                      )}
                    </div>
                    {(rawReports.mobsf && rawReports.sonar) ? (
                      <div>
                        <div className="mb-2 text-muted small">
                          <strong>MobSF Issues:</strong> {Object.keys(rawReports.mobsf?.code_analysis || {}).length} | 
                          <strong> SonarQube Vulnerabilities:</strong> {rawReports.sonar?.measures?.vulnerabilities || 0}
                        </div>
                        <pre style={{ 
                          background: '#f0e7ff', 
                          padding: 15, 
                          borderRadius: 8, 
                          maxHeight: 500, 
                          overflow: 'auto',
                          fontSize: 11,
                          whiteSpace: 'pre-wrap'
                        }}>
                          {JSON.stringify({ mobsf: rawReports.mobsf, sonarqube: rawReports.sonar }, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <Alert variant="warning">Combined reports not available. Run all tools first.</Alert>
                    )}
                  </Card.Body>
                </Card>
              </Tab>
            </Tabs>
          </div>
        )}

        {/* placeholder */}
        {viewMode === 'none' && (
          <div className="text-center text-muted p-5">
            <div className="mb-3" style={{ fontSize: 48 }}>📊</div>
            <h5>No Report Loaded</h5>
            <p>Select a scan from the list or upload a new APK to begin analysis.</p>
            <p className="small">For comprehensive results, click <strong>Run All</strong> to execute multi-tool analysis.</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
