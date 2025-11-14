// src/components/HumanReport.js
import React, { useState } from "react";
import { Card, Badge, Table, Row, Col, ListGroup, Container, Button, Collapse } from "react-bootstrap";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

/*
  HumanReport (updated)
  - Includes dangerous permissions in the security score calculation
  - Chart + score on top, compact APK info, findings below
  - No on-slice labels (use legend below)
  - Paste this file to: mobsf-frontend/src/components/HumanReport.js
*/

const SEVERITY_COLORS = {
  high: "#e63946",      // red
  medium: "#f4c542",    // yellow
  info: "#59b5ff",      // sky blue
};

function SeverityBadge({ sev }) {
  if (!sev) return null;
  const s = (sev || "").toLowerCase();
  if (s.includes("high") || s.includes("critical")) return <Badge bg="danger" className="ms-1">High</Badge>;
  if (s.includes("warn") || s.includes("medium") || s.includes("warning")) return <Badge bg="warning" text="dark" className="ms-1">Medium</Badge>;
  return <Badge bg="info" className="ms-1">Normal</Badge>;
}

const short = (t, n = 160) =>
  typeof t === "string" ? (t.length > n ? t.slice(0, n) + "…" : t) : (t ? String(t).slice(0, n) : "");

export default function HumanReport({ data }) {
  const [expandedSections, setExpandedSections] = useState({
    high: true,
    medium: false,
    info: false,
    perms: false
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

  // -------------------------
  // Gather findings (manifest, api, others)
  // -------------------------
  const manifestAnalysis = data.manifest_analysis || data.Manifest || data.manifest || {};
  const manifestFindingsRaw = Array.isArray(manifestAnalysis.manifest_findings)
    ? manifestAnalysis.manifest_findings
    : Array.isArray(manifestAnalysis.findings)
    ? manifestAnalysis.findings
    : [];
  const manifestFindings = manifestFindingsRaw.filter(item => item && (typeof item !== "string" || item.trim() !== ""));

  const apiFindings = Array.isArray(data.api) ? data.api : Array.isArray(data.api_findings) ? data.api_findings : [];
  const otherFindings = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : [];

  const rawFindings = [...manifestFindings, ...apiFindings, ...otherFindings];

  const normalizeFinding = (f) => {
    if (!f) return null;
    const title = f.title || f.name || f.check || f.issue || (typeof f === "string" ? f : (f.issue_title || f.rule || JSON.stringify(f).slice(0,60)));
    const severity = (f.severity || f.level || f.risk || "").toString().toLowerCase() || "info";
    const description = f.description || f.desc || f.details || f.message || f.snippet || f.detail || "";
    const path = f.path || f.file || f.location || f.component || "";
    const remediation = f.remediation || f.fix || f.recommendation || f.fix_recommendation || f.remediation_text || null;
    return { title, severity, description, path, remediation };
  };

  const findings = rawFindings.map(normalizeFinding).filter(Boolean);

  // -------------------------
  // Counts by severity
  // -------------------------
  const counts = findings.reduce((acc, f) => {
    const s = (f.severity || "info").toLowerCase();
    if (s.includes("high") || s.includes("critical")) acc.high++;
    else if (s.includes("warn") || s.includes("medium") || s === "warning") acc.medium++;
    else acc.info++;
    return acc;
  }, { high: 0, medium: 0, info: 0 });

  // -------------------------
  // Dangerous permissions detection (unified variable)
  // -------------------------
  const permsObj = data.permissions || data.Permission || data.manifest_permissions || {};
  const dangerousPerms = Object.entries(permsObj)
    .filter(([k, v]) => {
      if (!v) return false;
      const vv = typeof v === "string" ? v : (v.status || v.level || v.risk || v.description || "");
      // check both description/status and permission name keywords
      return /(dangerous|danger|privileged)/i.test(vv) ||
        /(WRITE|RECORD|CALL|SMS|LOCATION|CAMERA|STORAGE|CONTACTS|RECORD_AUDIO|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|SYSTEM_ALERT_WINDOW|GET_ACCOUNTS|AUTHENTICATE_ACCOUNTS|REQUEST_INSTALL_PACKAGES)/i.test(k);
    })
    .map(([k, v]) => ({ name: k, info: typeof v === "string" ? v : (v.description || JSON.stringify(v)) }));

  const dangerousPermsCount = dangerousPerms.length;

  // -------------------------
  // Score calculation (includes dangerous permissions)
  // - weights: high=10, medium=5, info=1, dangerous-permission=8
  // - normalized by overall items to avoid 0 for large apps
  // -------------------------
  const totalFindings = counts.high + counts.medium + counts.info;
  const overallItems = totalFindings + dangerousPermsCount;
  const weightedPenalty = (counts.high * 10) + (counts.medium * 5) + (counts.info * 1) + (dangerousPermsCount * 8);
  const maxPenalty = Math.max(overallItems * 10, 1);
  const score = Math.max(0, Math.round(100 - (weightedPenalty / maxPenalty) * 100));

  // -------------------------
  // Pie data (High/Medium/Info)
  // -------------------------
  const pieData = [
    { name: 'High', key: 'high', value: counts.high, color: SEVERITY_COLORS.high },
    { name: 'Medium', key: 'medium', value: counts.medium, color: SEVERITY_COLORS.medium },
    { name: 'Info', key: 'info', value: counts.info, color: SEVERITY_COLORS.info },
  ];

  // Categorized lists
  const highFindings = findings.filter(f => (f.severity || "").includes("high") || (f.severity || "").includes("critical"));
  const medFindings = findings.filter(f => (f.severity || "").includes("warn") || (f.severity || "").includes("medium") || (f.severity || "").includes("warning"));
  const infoFindings = findings.filter(f => !((f.severity || "").includes("high") || (f.severity || "").includes("warn") || (f.severity || "").includes("medium") || (f.severity || "").includes("critical")));

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <div>
      {/* TOP: Chart + Score + Compact Info */}
      <Card className="mb-3 shadow-lg" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
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
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, textShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}>Security Score</div>
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
                  <div>High: <strong>{counts.high}</strong> &nbsp; Medium: <strong>{counts.medium}</strong> &nbsp; Info: <strong>{counts.info}</strong></div>
                  <div className="mt-1">Dangerous perms: <strong>{dangerousPermsCount}</strong></div>
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
                    <tr><th style={{ border: 'none' }}>SDK</th><td style={{ border: 'none' }}>{targetSdk}/{minSdk}</td></tr>
                  </tbody>
                </Table>
              </Col>
            </Row>
          </Container>
        </Card.Body>
      </Card>

      {/* Vulnerabilities */}
      <Card className="mb-3 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Card.Title className="mb-0">⚠️ Key Vulnerabilities</Card.Title>
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
              {highFindings.length === 0 ? <div className="text-muted small mb-3">No high severity issues.</div> : (
                <ListGroup className="mb-3">
                  {highFindings.map((f,i)=>(
                    <ListGroup.Item key={i}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div style={{flex:1}}>
                          <strong dangerouslySetInnerHTML={{__html: f.title}} /> <SeverityBadge sev={f.severity} />
                          <div className="small text-muted mt-1">{short(f.description)}</div>
                          {f.path && <div className="small text-muted">📁 Path: {f.path}</div>}
                        </div>
                        <div style={{minWidth:240}}>
                          {f.remediation ? (
                            <>
                              <div className="small text-muted">💡 Fix recommendation:</div>
                              <div style={{marginTop:6, background: '#fff3cd', padding: 8, borderRadius: 6, border: '1px solid #ffc107'}}><em className="small">{short(f.remediation, 400)}</em></div>
                            </>
                          ) : (
                            <div className="small text-muted">No fix recommendation provided in report.</div>
                          )}
                        </div>
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
              {medFindings.length === 0 ? <div className="text-muted small mb-3">No medium severity issues.</div> : (
                <ListGroup className="mb-3">
                  {medFindings.map((f,i)=>(
                    <ListGroup.Item key={i}>
                      <strong dangerouslySetInnerHTML={{__html: f.title}} /> <SeverityBadge sev={f.severity} />
                      <div className="small text-muted mt-1">{short(f.description)}</div>
                      {f.remediation && <div className="small mt-1" style={{ background: '#e7f3ff', padding: 6, borderRadius: 4 }}><strong>💡 Fix:</strong> <em>{short(f.remediation, 400)}</em></div>}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </div>
          </Collapse>

          <Collapse in={expandedSections.info}>
            <div>
              <h6 className="text-info">ℹ️ Other findings ({infoFindings.length})</h6>
              {infoFindings.length === 0 ? <div className="text-muted small mb-3">No other issues.</div> : (
                <ListGroup className="mb-3">
                  {infoFindings.slice(0, 10).map((f,i)=>(
                    <ListGroup.Item key={i}>
                      <strong dangerouslySetInnerHTML={{__html: f.title}} /> <SeverityBadge sev={f.severity} />
                      <div className="small text-muted mt-1">{short(f.description)}</div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
              {infoFindings.length > 10 && <div className="text-muted text-center">... and {infoFindings.length - 10} more</div>}
            </div>
          </Collapse>
        </Card.Body>
      </Card>

      {/* Dangerous permissions */}
      <Card className="mb-3 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <Card.Title className="mb-0">📜 Dangerous Permissions ({dangerousPermsCount})</Card.Title>
            <Button size="sm" variant="outline-secondary" onClick={() => toggleSection('perms')}>
              {expandedSections.perms ? '▼ Collapse' : '▶ Expand'}
            </Button>
          </div>
          <Collapse in={expandedSections.perms}>
            <div>
              {dangerousPermsCount === 0 ? (
                <div className="text-muted small">No dangerous permissions detected.</div>
              ) : (
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
              )}
            </div>
          </Collapse>
        </Card.Body>
      </Card>
    </div>
  );
}
