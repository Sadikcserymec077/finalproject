// src/components/ReportPanel.js
import React, { useState, useEffect } from "react";
import { Card, Button, Badge, ButtonGroup, Spinner, Alert } from "react-bootstrap";
import { savePdfReport, saveJsonReport, getReportJSON } from "../api";
import HumanReport from "./HumanReport";
import TagManager from "./TagManager";
import AnnotationsPanel from "./AnnotationsPanel";

export default function ReportPanel({ hash, onNewAnalysis }) {
  const [report, setReport] = useState(null);
  const [jsonPath, setJsonPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [msg, setMsg] = useState("");
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    // Reset when hash changes
    setReport(null);
    setJsonPath(null);
    setPdfUrl(null);
    setMsg("");
    setShowPdf(false);

    if (!hash) return;

    // Auto-load saved JSON report when a new hash is selected
    (async () => {
      setLoading(true);
      setMsg("Loading analysis report...");
      try {
        const r = await saveJsonReport(hash);
        const payload = r.data.data || r.data;
        setReport(payload);
        setJsonPath(r.data.path || `/reports/json/${hash}`);
        setMsg("");
      } catch (e) {
        // fallback to GET proxy
        try {
          const r2 = await getReportJSON(hash);
          setReport(r2.data);
          setMsg("");
        } catch (e2) {
          setMsg("Failed to load report: " + (e2?.response?.data || e2?.message || e?.message));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [hash]);

  const handlePreviewPDF = async () => {
    if (!hash) { setMsg("No hash selected"); return; }
    setLoading(true); 
    setMsg("Fetching PDF...");
    try {
      const r = await savePdfReport(hash);
      const blob = new Blob([r.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setShowPdf(true);
      setMsg("PDF preview loaded below.");
    } catch (e) {
      // Extract error message from response
      let errorMsg = "PDF fetch failed";
      if (e?.response?.data) {
        if (typeof e.response.data === 'object') {
          errorMsg = e.response.data.message || e.response.data.error || errorMsg;
        } else if (typeof e.response.data === 'string') {
          errorMsg = e.response.data;
        }
      } else if (e?.message) {
        errorMsg = e.message;
      }
      setMsg(errorMsg);
    } finally { 
      setLoading(false); 
    }
  };


  const handleDownloadPdf = async () => {
    if (!hash) { setMsg("No hash selected"); return; }
    setLoading(true);
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
      // Extract error message from response
      let errorMsg = "Download failed";
      if (e?.response?.data) {
        if (typeof e.response.data === 'object') {
          errorMsg = e.response.data.message || e.response.data.error || errorMsg;
        } else if (typeof e.response.data === 'string') {
          errorMsg = e.response.data;
        }
      } else if (e?.message) {
        errorMsg = e.message;
      }
      setMsg(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const closePdf = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setShowPdf(false);
  };

  return (
    <Card className="shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <Card.Title className="mb-3" style={{ fontWeight: 700, fontSize: '1.4rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '8px' }}>📊</span>
              Analysis Report
            </Card.Title>
            <div className="text-muted mb-2 d-flex align-items-center">
              <strong className="me-2">Hash:</strong>
              <Badge 
                bg="light" 
                text="dark"
                style={{
                  padding: '6px 12px',
                  borderRadius: '12px',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                {hash || "none"}
              </Badge>
            </div>
          </div>

          <div className="text-end d-flex flex-column gap-2">
            <div>
              <ButtonGroup size="sm">
                <Button 
                  variant="warning" 
                  onClick={handlePreviewPDF} 
                  disabled={!hash || loading}
                  style={{
                    borderRadius: '12px',
                    padding: '0.5rem 1rem',
                    fontWeight: 600
                  }}
                >
                  📄 PDF Preview
                </Button>
                <Button 
                  variant="success" 
                  onClick={handleDownloadPdf} 
                  disabled={!hash || loading}
                  style={{
                    borderRadius: '12px',
                    padding: '0.5rem 1rem',
                    fontWeight: 600
                  }}
                >
                  💾 Download PDF
                </Button>
                {showPdf && (
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    onClick={closePdf}
                    style={{
                      borderRadius: '12px',
                      padding: '0.5rem 1rem',
                      fontWeight: 600
                    }}
                  >
                    ✕ Close PDF
                  </Button>
                )}
              </ButtonGroup>
            </div>
            {onNewAnalysis && (
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={onNewAnalysis}
                style={{
                  borderRadius: '12px',
                  padding: '0.5rem 1rem',
                  fontWeight: 600
                }}
              >
                🔄 New Analysis
              </Button>
            )}
          </div>
        </div>

        {loading && (
          <Alert variant="info" className="d-flex align-items-center py-2" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
            <Spinner animation="border" size="sm" className="me-2" />
            {msg}
          </Alert>
        )}
        
        {!loading && msg && (
          <Alert 
            variant="info" 
            className="py-3" 
            style={{ 
              background: 'var(--card-bg)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              fontWeight: 500
            }}
          >
            {msg}
          </Alert>
        )}

        {/* Show the detailed report */}
        {!loading && report && !showPdf && (
          <div>
            {hash && (
              <div className="mb-3">
                <TagManager hash={hash} />
              </div>
            )}
            <HumanReport data={report} />
            {hash && (
              <AnnotationsPanel hash={hash} />
            )}
          </div>
        )}

        {/* PDF preview */}
        {showPdf && pdfUrl && (
          <div>
            <iframe 
              title="report-pdf" 
              src={pdfUrl} 
              style={{ 
                width: '100%', 
                height: 640, 
                border: '1px solid #ddd', 
                borderRadius: 12 
              }} 
            />
          </div>
        )}

        {/* placeholder */}
        {!loading && !report && !showPdf && (
          <div className="text-center text-muted p-5" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div className="mb-4" style={{ fontSize: '5rem', animation: 'float 3s ease-in-out infinite' }}>📊</div>
            <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>No Report Loaded</h4>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              Analysis report will appear here once the scan is complete.
            </p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
