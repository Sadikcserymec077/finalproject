// src/components/HumanReport.js
import React, { useState } from "react";
import { Card, Badge, Table, Row, Col, ListGroup, Container, Button, Collapse, OverlayTrigger, Tooltip as BSTooltip, Accordion, Alert } from "react-bootstrap";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const SEVERITY_COLORS = {
  high: "#e63946",      // red
  medium: "#f4c542",    // yellow
  warning: "#f4c542",   // yellow (same as medium)
  info: "#59b5ff",      // sky blue
  secure: "#90ee90",    // green
};

function SeverityBadge({ sev }) {
  if (!sev) return null;
  const s = (sev || "").toLowerCase();
  if (s.includes("high") || s.includes("critical")) return <Badge bg="danger" className="ms-1">High</Badge>;
  if (s.includes("warn") || s.includes("medium") || s === "warning") return <Badge bg="warning" text="dark" className="ms-1">Medium</Badge>;
  if (s === "secure" || s === "good") return <Badge bg="success" className="ms-1">Secure</Badge>;
  return <Badge bg="info" className="ms-1">Info</Badge>;
}

const short = (t, n = 160) =>
  typeof t === "string" ? (t.length > n ? t.slice(0, n) + "…" : t) : (t ? String(t).slice(0, n) : "");

export default function HumanReport({ data }) {
  const [expandedSections, setExpandedSections] = useState({
    high: true,
    medium: false,
    info: false,
    perms: false,
    certificate: false,
    manifest: false,
    code: false,
    binary: false,
    network: false
  });

  if (!data) return <div className="text-muted">No report loaded.</div>;

  // -------------------------
  // Basic metadata
  // -------------------------
  const appName = data.app_name || data.APP_NAME || data.file_name || data.file || "(unknown)";
  const fileName = data.file_name || data.FILE_NAME || "(unknown)";
  const size = data.size || data.file_size || data.apk_size || "unknown";
  const packageName = data.package_name || data.PACKAGE_NAME || "(unknown)";
  const versionName = data.version_name || data.VERSION_NAME || "-";
  const targetSdk = data.target_sdk || data.TargetSdkVersion || "-";
  const minSdk = data.min_sdk || data.MinSdkVersion || "-";
  const md5 = data.hash || data.MD5 || data.md5 || "(n/a)";
  const sha1 = data.sha1 || data.SHA1 || "-";
  const sha256 = data.sha256 || data.SHA256 || "-";

  // -------------------------
  // Extract findings from ALL sections
  // -------------------------
  const allFindings = [];

  // 1. Certificate Analysis Findings
  const certAnalysis = data.certificate_analysis || {};
  const certFindings = certAnalysis.certificate_findings || [];
  certFindings.forEach(f => {
    if (Array.isArray(f) && f.length >= 3) {
      const [severity, description, title] = f;
      allFindings.push({
        category: "Certificate Analysis",
        title: title || "Certificate Issue",
        severity: severity || "info",
        description: description || "",
        path: "",
        remediation: null
      });
    }
  });

  // 2. Manifest Analysis Findings
  const manifestAnalysis = data.manifest_analysis || data.Manifest || data.manifest || {};
  const manifestFindingsRaw = Array.isArray(manifestAnalysis.manifest_findings)
    ? manifestAnalysis.manifest_findings
    : Array.isArray(manifestAnalysis.findings)
    ? manifestAnalysis.findings
    : [];
  manifestFindingsRaw.forEach(f => {
    if (f && typeof f === "object") {
      allFindings.push({
        category: "Manifest Analysis",
        title: f.title || f.name || "Manifest Issue",
        severity: (f.severity || "info").toLowerCase(),
        description: f.description || "",
        path: f.path || f.file || "",
        remediation: f.remediation || null
      });
    }
  });

  // 3. Code Analysis Findings
  const codeAnalysis = data.code_analysis || {};
  const codeFindings = codeAnalysis.findings || {};
  Object.entries(codeFindings).forEach(([key, finding]) => {
    if (finding && finding.metadata) {
      const meta = finding.metadata;
      const files = finding.files || {};
      const fileList = Object.keys(files).join(", ");
      allFindings.push({
        category: "Code Analysis",
        title: meta.description || key,
        severity: (meta.severity || "info").toLowerCase(),
        description: meta.description || "",
        path: fileList,
        remediation: null,
        cwe: meta.cwe,
        owasp: meta["owasp-mobile"],
        masvs: meta.masvs
      });
    }
  });

  // 4. Network Security Findings
  const networkSecurity = data.network_security || {};
  const networkFindings = networkSecurity.network_findings || [];
  networkFindings.forEach(f => {
    if (f && typeof f === "object") {
      allFindings.push({
        category: "Network Security",
        title: f.title || f.name || "Network Issue",
        severity: (f.severity || "info").toLowerCase(),
        description: f.description || "",
        path: f.path || "",
        remediation: f.remediation || null
      });
    }
  });

  // 5. Binary Analysis Findings (extract high/warning severity items)
  // NOTE: Binary analysis is NOT added to allFindings to exclude it from summary
  // It will be displayed separately in the category view only
  const binaryAnalysis = data.binary_analysis || [];
  const binaryFindings = [];
  binaryAnalysis.forEach(binary => {
    if (binary && binary.name) {
      // Check each security property
      const checks = ['nx', 'pie', 'stack_canary', 'relocation_readonly', 'rpath', 'runpath', 'fortify', 'symbol'];
      checks.forEach(check => {
        if (binary[check] && binary[check].severity) {
          const sev = binary[check].severity.toLowerCase();
          if (sev === "high" || sev === "warning") {
            binaryFindings.push({
              category: "Binary Analysis",
              title: `${check.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${binary.name}`,
              severity: sev,
              description: binary[check].description || "",
              path: binary.name,
              remediation: null
            });
          }
        }
      });
    }
  });

  // 6. API Findings (if any)
  const apiFindings = Array.isArray(data.api) ? data.api : Array.isArray(data.api_findings) ? data.api_findings : [];
  apiFindings.forEach(f => {
    if (f && typeof f === "object") {
      allFindings.push({
        category: "API Analysis",
        title: f.title || f.name || "API Issue",
        severity: (f.severity || f.level || "info").toLowerCase(),
        description: f.description || "",
        path: f.path || "",
        remediation: f.remediation || null
      });
    }
  });

  // -------------------------
  // Counts by severity (from ALL findings)
  // -------------------------
  const counts = allFindings.reduce((acc, f) => {
    const s = (f.severity || "info").toLowerCase();
    if (s.includes("high") || s.includes("critical")) acc.high++;
    else if (s.includes("warn") || s.includes("medium") || s === "warning") acc.medium++;
    else if (s === "secure" || s === "good") acc.secure++;
    else acc.info++;
    return acc;
  }, { high: 0, medium: 0, info: 0, secure: 0 });

  // Get counts from summaries (more accurate - matches PDF)
  const certSummary = certAnalysis.certificate_summary || {};
  const manifestSummary = manifestAnalysis.manifest_summary || {};
  const codeSummary = codeAnalysis.summary || {};
  const networkSummary = networkSecurity.network_summary || {};

  // Combine summary counts from all sections (matches PDF calculation)
  const totalHigh = (certSummary.high || 0) + (manifestSummary.high || 0) + (codeSummary.high || 0) + (networkSummary.high || 0);
  const totalMedium = (certSummary.warning || 0) + (manifestSummary.warning || 0) + (codeSummary.warning || 0) + (networkSummary.warning || 0);
  const totalInfo = (certSummary.info || 0) + (manifestSummary.info || 0) + (codeSummary.info || 0) + (networkSummary.info || 0);

  // Use summary counts (matches PDF report)
  const finalCounts = {
    high: totalHigh,
    medium: totalMedium,
    info: totalInfo,
    secure: codeSummary.secure || 0
  };

  // -------------------------
  // Dangerous permissions detection
  // -------------------------
  const permsObj = data.permissions || data.Permission || data.manifest_permissions || {};
  const dangerousPerms = Object.entries(permsObj)
    .filter(([k, v]) => {
      if (!v) return false;
      const vv = typeof v === "string" ? v : (v.status || v.level || v.risk || v.description || "");
      return /(dangerous|danger|privileged)/i.test(vv) ||
        /(WRITE|RECORD|CALL|SMS|LOCATION|CAMERA|STORAGE|CONTACTS|RECORD_AUDIO|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|SYSTEM_ALERT_WINDOW|GET_ACCOUNTS|AUTHENTICATE_ACCOUNTS|REQUEST_INSTALL_PACKAGES)/i.test(k);
    })
    .map(([k, v]) => ({ name: k, info: typeof v === "string" ? v : (v.description || JSON.stringify(v)) }));

  const dangerousPermsCount = dangerousPerms.length;

  // -------------------------
  // Score calculation (matches PDF calculation - based on ALL findings)
  // - weights: high=10, medium/warning=5, info=1, dangerous-permission=8
  // First check if score is already calculated in the data
  // -------------------------
  let score;
  if (data.security_score !== undefined && data.security_score !== null) {
    // Use pre-calculated score if available
    score = data.security_score;
  } else if (data.securityScore !== undefined && data.securityScore !== null) {
    // Alternative field name
    score = data.securityScore;
  } else {
    // Calculate from findings
  const totalFindings = finalCounts.high + finalCounts.medium + finalCounts.info;
  const overallItems = totalFindings + dangerousPermsCount;
  const weightedPenalty = (finalCounts.high * 10) + (finalCounts.medium * 5) + (finalCounts.info * 1) + (dangerousPermsCount * 8);
  const maxPenalty = Math.max(overallItems * 10, 1);
    score = Math.max(0, Math.round(100 - (weightedPenalty / maxPenalty) * 100));
  }

  // -------------------------
  // Pie data (High/Medium/Info)
  // -------------------------
  const pieData = [
    { name: 'High', key: 'high', value: finalCounts.high, color: SEVERITY_COLORS.high },
    { name: 'Medium', key: 'medium', value: finalCounts.medium, color: SEVERITY_COLORS.medium },
    { name: 'Info', key: 'info', value: finalCounts.info, color: SEVERITY_COLORS.info },
  ].filter(d => d.value > 0);

  // Categorized lists
  const highFindings = allFindings.filter(f => {
    const s = (f.severity || "").toLowerCase();
    return s.includes("high") || s.includes("critical");
  });
  const medFindings = allFindings.filter(f => {
    const s = (f.severity || "").toLowerCase();
    return s.includes("warn") || s.includes("medium") || s === "warning";
  });
  const infoFindings = allFindings.filter(f => {
    const s = (f.severity || "").toLowerCase();
    return !(s.includes("high") || s.includes("warn") || s.includes("medium") || s.includes("critical") || s === "secure" || s === "good");
  });

  // Group findings by category
  const findingsByCategory = allFindings.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});
  
  // Add binary findings separately to category view (not in summary)
  if (binaryFindings.length > 0) {
    findingsByCategory["Binary Analysis"] = binaryFindings;
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <div>
      {/* TOP: Chart + Score + Compact Info */}
      <Card className="mb-3 shadow-lg" style={{ background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)', color: 'white' }}>
        <Card.Body>
          <Container>
            <Row className="align-items-center">
              {/* Chart */}
              <Col md={4} className="text-center">
                <div style={{ width: 200, height: 160, margin: "0 auto" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        innerRadius={30}
                        labelLine={false}
                        label={false}
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                  {pieData.map(d => (
                    <div key={d.key} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 12, height: 12, background: d.color, display: "inline-block", borderRadius: 3 }} />
                      <small style={{ color: "white", fontWeight: 600 }}>{d.name}: <strong>{d.value}</strong></small>
                    </div>
                  ))}
                </div>
              </Col>

              {/* Score */}
              <Col md={4} className="text-center">
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <BSTooltip>
                      <strong>How is the score calculated?</strong><br />
                      Based on all findings: High (10pts), Medium (5pts), Info (1pt), Dangerous permissions (8pts each).<br />
                      Higher score = Safer app. 100 = No issues detected.
                    </BSTooltip>
                  }
                >
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, textShadow: '1px 1px 2px rgba(0,0,0,0.2)', cursor: 'pointer' }}>Security Score ℹ️</div>
                </OverlayTrigger>
                <div style={{
                  fontSize: 48,
                  fontWeight: 900,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                  color: score > 80 ? "#90ee90" : score > 50 ? "#f4c542" : "#ff6b6b"
                }}>
                  {score}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>out of 100</div>
                <div style={{ marginTop: 12, width: 180, margin: "12px auto 0" }}>
                  <div style={{ height: 12, background: "rgba(255,255,255,0.3)", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{
                      width: `${score}%`,
                      height: "100%",
                      background: score > 80 ? "#2ca02c" : score > 50 ? SEVERITY_COLORS.medium : SEVERITY_COLORS.high,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>

                <div className="mt-3" style={{ fontSize: 13, color: "white", fontWeight: 500 }}>
                  <div>High: <strong>{finalCounts.high}</strong> &nbsp; Medium: <strong>{finalCounts.medium}</strong> &nbsp; Info: <strong>{finalCounts.info}</strong></div>
                  <div className="mt-1">Dangerous perms: <strong>{dangerousPermsCount}</strong></div>
                </div>
                
                {/* Install Recommendation */}
                <div className="mt-4">
                  {score >= 70 ? (
                    <Alert variant="success" style={{ 
                      background: 'rgba(40, 167, 69, 0.2)', 
                      border: '2px solid rgba(40, 167, 69, 0.5)',
                      borderRadius: '12px',
                      padding: '12px',
                      margin: 0
                    }}>
                      <div className="d-flex align-items-center">
                        <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>✅</span>
                        <div>
                          <strong>Safe to Install</strong>
                          <div className="small mt-1">This app has a good security score. It's generally safe to install.</div>
                        </div>
                      </div>
                    </Alert>
                  ) : score >= 40 ? (
                    <Alert variant="warning" style={{ 
                      background: 'rgba(255, 193, 7, 0.2)', 
                      border: '2px solid rgba(255, 193, 7, 0.5)',
                      borderRadius: '12px',
                      padding: '12px',
                      margin: 0
                    }}>
                      <div className="d-flex align-items-center">
                        <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>⚠️</span>
                        <div>
                          <strong>Install with Caution</strong>
                          <div className="small mt-1">This app has moderate security issues. Review the findings before installing.</div>
                        </div>
                      </div>
                    </Alert>
                  ) : (
                    <Alert variant="danger" style={{ 
                      background: 'rgba(220, 53, 69, 0.2)', 
                      border: '2px solid rgba(220, 53, 69, 0.5)',
                      borderRadius: '12px',
                      padding: '12px',
                      margin: 0
                    }}>
                      <div className="d-flex align-items-center">
                        <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>🚫</span>
                        <div>
                          <strong>Not Recommended to Install</strong>
                          <div className="small mt-1">This app has significant security vulnerabilities. Avoid installing unless necessary.</div>
                        </div>
                      </div>
                    </Alert>
                  )}
                </div>
              </Col>

              {/* Compact APK info */}
              <Col md={4}>
                <h6 style={{ marginBottom: 12, fontWeight: 700, textShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}>App Information</h6>
                <Table size="sm" className="text-white" style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
                  <tbody>
                    <tr><th style={{ borderColor: 'rgba(255,255,255,0.2)' }}>Name</th><td style={{ maxWidth: 180, borderColor: 'rgba(255,255,255,0.2)' }}>{appName}</td></tr>
                    <tr><th style={{ borderColor: 'rgba(255,255,255,0.2)' }}>File</th><td style={{ borderColor: 'rgba(255,255,255,0.2)' }}>{fileName}</td></tr>
                    <tr><th style={{ borderColor: 'rgba(255,255,255,0.2)' }}>Pkg</th><td style={{ borderColor: 'rgba(255,255,255,0.2)' }}>{packageName}</td></tr>
                    <tr><th style={{ borderColor: 'rgba(255,255,255,0.2)' }}>Ver</th><td style={{ borderColor: 'rgba(255,255,255,0.2)' }}>{versionName}</td></tr>
                    <tr><th style={{ borderColor: 'rgba(255,255,255,0.2)' }}>Size</th><td style={{ borderColor: 'rgba(255,255,255,0.2)' }}>{size}</td></tr>
                    <tr>
                      <th style={{ border: 'none' }}>
                        <OverlayTrigger
                          placement="left"
                          overlay={<BSTooltip>SDK: Software Development Kit versions (Target/Minimum Android API levels)</BSTooltip>}
                        >
                          <span style={{ cursor: 'pointer' }}>SDK ℹ️</span>
                        </OverlayTrigger>
                      </th>
                      <td style={{ border: 'none' }}>{targetSdk}/{minSdk}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
            </Row>
          </Container>
        </Card.Body>
      </Card>

      {/* Vulnerabilities by Severity */}
      <Card className="mb-3 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <Card.Title className="mb-0">⚠️ Security Findings by Severity</Card.Title>
              <small className="text-muted">All security issues found across all analysis sections</small>
            </div>
            <div>
              <Button size="sm" variant="outline-secondary" onClick={() => toggleSection('high')}>
                {expandedSections.high ? '▼' : '▶'} High ({highFindings.length})
              </Button>
              <Button size="sm" variant="outline-secondary" className="ms-2" onClick={() => toggleSection('medium')}>
                {expandedSections.medium ? '▼' : '▶'} Medium ({medFindings.length})
              </Button>
              <Button size="sm" variant="outline-secondary" className="ms-2" onClick={() => toggleSection('info')}>
                {expandedSections.info ? '▼' : '▶'} Other ({infoFindings.length})
              </Button>
            </div>
          </div>

          <Collapse in={expandedSections.high}>
            <div>
              <h6 className="text-danger">🔥 High Severity ({highFindings.length})</h6>
              <p className="small text-muted mb-3">Critical security risks that should be addressed immediately.</p>
              {highFindings.length === 0 ? <div className="text-muted small mb-3">No high severity issues.</div> : (
                <ListGroup className="mb-3">
                  {highFindings.map((f,i)=>(
                    <ListGroup.Item key={i}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div style={{flex:1}}>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>{f.category}</Badge>
                            <strong dangerouslySetInnerHTML={{__html: f.title}} /> <SeverityBadge sev={f.severity} />
                          </div>
                          <div className="small text-muted mt-1">{short(f.description)}</div>
                          {f.path && <div className="small text-muted mt-1">📁 Location: {f.path}</div>}
                          {f.cwe && <div className="small text-muted mt-1">🔗 CWE: {f.cwe}</div>}
                          {f.owasp && <div className="small text-muted">🛡️ OWASP: {f.owasp}</div>}
                        </div>
                        {f.remediation && (
                          <div style={{minWidth:240}}>
                            <div className="small text-muted">💡 How to fix:</div>
                            <div style={{marginTop:6, background: 'var(--bg-secondary)', padding: 8, borderRadius: 6, border: '1px solid var(--border-color)'}}><em className="small">{short(f.remediation, 400)}</em></div>
                          </div>
                        )}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </div>
          </Collapse>

          <Collapse in={expandedSections.medium}>
            <div>
              <h6 className="text-warning">⚡ Medium Severity ({medFindings.length})</h6>
              <p className="small text-muted mb-3">Moderate security concerns that should be reviewed and fixed when possible.</p>
              {medFindings.length === 0 ? <div className="text-muted small mb-3">No medium severity issues.</div> : (
                <ListGroup className="mb-3">
                  {medFindings.map((f,i)=>(
                    <ListGroup.Item key={i}>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>{f.category}</Badge>
                        <strong dangerouslySetInnerHTML={{__html: f.title}} /> <SeverityBadge sev={f.severity} />
                      </div>
                      <div className="small text-muted mt-1">{short(f.description)}</div>
                      {f.path && <div className="small text-muted mt-1">📁 Location: {f.path}</div>}
                      {f.cwe && <div className="small text-muted mt-1">🔗 CWE: {f.cwe}</div>}
                      {f.remediation && <div className="small mt-1" style={{ background: 'var(--bg-secondary)', padding: 6, borderRadius: 4 }}><strong>💡 How to fix:</strong> <em>{short(f.remediation, 400)}</em></div>}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </div>
          </Collapse>

          <Collapse in={expandedSections.info}>
            <div>
              <h6 className="text-info">ℹ️ Other findings ({infoFindings.length})</h6>
              <p className="small text-muted mb-3">Informational notes and minor observations.</p>
              {infoFindings.length === 0 ? <div className="text-muted small mb-3">No other issues.</div> : (
                <ListGroup className="mb-3">
                  {infoFindings.slice(0, 10).map((f,i)=>(
                    <ListGroup.Item key={i}>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>{f.category}</Badge>
                        <strong dangerouslySetInnerHTML={{__html: f.title}} /> <SeverityBadge sev={f.severity} />
                      </div>
                      <div className="small text-muted mt-1">{short(f.description)}</div>
                      {f.path && <div className="small text-muted mt-1">📁 Location: {f.path}</div>}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
              {infoFindings.length > 10 && <div className="text-muted text-center">... and {infoFindings.length - 10} more</div>}
            </div>
          </Collapse>
        </Card.Body>
      </Card>

      {/* Findings by Category */}
      <Card className="mb-3 shadow-sm">
        <Card.Body>
          <Card.Title className="mb-3">📋 Findings by Analysis Category</Card.Title>
          <Accordion>
            {Object.entries(findingsByCategory).map(([category, findings]) => (
              <Accordion.Item eventKey={category} key={category}>
                <Accordion.Header>
                  <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                    <div>
                      <strong>{category}</strong>
                      <Badge bg="secondary" className="ms-2">{findings.length} findings</Badge>
                    </div>
                    <div>
                      <Badge bg="danger" className="me-1">High: {findings.filter(f => (f.severity || "").toLowerCase().includes("high")).length}</Badge>
                      <Badge bg="warning" text="dark" className="me-1">Med: {findings.filter(f => (f.severity || "").toLowerCase().includes("warn") || (f.severity || "").toLowerCase().includes("medium")).length}</Badge>
                      <Badge bg="info">Info: {findings.filter(f => !(f.severity || "").toLowerCase().includes("high") && !(f.severity || "").toLowerCase().includes("warn")).length}</Badge>
                    </div>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <ListGroup variant="flush">
                    {findings.slice(0, 20).map((f, idx) => (
                      <ListGroup.Item key={idx}>
                        <div className="d-flex align-items-start gap-2">
                          <SeverityBadge sev={f.severity} />
                          <div style={{ flex: 1 }}>
                            <strong dangerouslySetInnerHTML={{__html: f.title}} />
                            <div className="small text-muted mt-1">{short(f.description)}</div>
                            {f.path && <div className="small text-muted mt-1">📁 {f.path}</div>}
                            {f.cwe && <div className="small text-muted mt-1">🔗 {f.cwe}</div>}
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                  {findings.length > 20 && <div className="text-muted text-center mt-2">... and {findings.length - 20} more findings</div>}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card.Body>
      </Card>

      {/* Dangerous permissions */}
      <Card className="mb-3 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <Card.Title className="mb-0">📜 Dangerous Permissions ({dangerousPermsCount})</Card.Title>
              <small className="text-muted">App permissions that can access sensitive user data or system features</small>
            </div>
            <Button size="sm" variant="outline-secondary" onClick={() => toggleSection('perms')}>
              {expandedSections.perms ? '▼ Collapse' : '▶ Expand'}
            </Button>
          </div>
          <Collapse in={expandedSections.perms}>
            <div>
              {dangerousPermsCount === 0 ? (
                <div className="text-muted small">No dangerous permissions detected.</div>
              ) : (
                <div>
                  <p className="small text-muted mb-3">These permissions allow the app to access sensitive features. Ensure they are necessary for the app's functionality.</p>
                  <ListGroup>
                    {dangerousPerms.map((p, i)=>(
                      <ListGroup.Item key={i}>
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <strong>{p.name}</strong> <Badge bg="danger" className="ms-2">Dangerous</Badge>
                            <div className="small text-muted mt-1">{short(p.info)}</div>
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              )}
            </div>
          </Collapse>
        </Card.Body>
      </Card>
    </div>
  );
}
