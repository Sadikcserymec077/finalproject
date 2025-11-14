// src/components/DetailedReport.js
import React, { useState } from "react";
import { Card, Badge, Table, Row, Col, ListGroup, Container, Tabs, Tab, ProgressBar, Accordion } from "react-bootstrap";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

/*
  DetailedReport - Unified Multi-Tool Analysis Report
  Displays merged findings from MobSF, Android Lint, and SonarQube
  with advanced visualizations and professional UI
*/

const SEVERITY_COLORS = {
  critical: "#8b0000",   // dark red
  high: "#e63946",       // red
  medium: "#f4c542",     // yellow
  low: "#59b5ff",        // sky blue
  info: "#90ee90",       // light green
};

const TOOL_COLORS = {
  MobSF: "#ff6b6b",
  "Android Lint": "#4ecdc4",
  SonarQube: "#45b7d1",
};

function SeverityBadge({ severity }) {
  const s = (severity || "info").toLowerCase();
  if (s === "critical") return <Badge bg="danger" className="ms-1">Critical</Badge>;
  if (s === "high") return <Badge bg="danger" className="ms-1">High</Badge>;
  if (s === "medium" || s === "warning") return <Badge bg="warning" text="dark" className="ms-1">Medium</Badge>;
  if (s === "low") return <Badge bg="info" className="ms-1">Low</Badge>;
  return <Badge bg="secondary" className="ms-1">Info</Badge>;
}

function ToolBadge({ tool }) {
  const colors = {
    MobSF: "danger",
    "Android Lint": "info",
    SonarQube: "primary",
  };
  return <Badge bg={colors[tool] || "secondary"}>{tool}</Badge>;
}

const short = (t, n = 200) =>
  typeof t === "string" ? (t.length > n ? t.slice(0, n) + "…" : t) : (t ? String(t).slice(0, n) : "");

export default function DetailedReport({ data }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!data) return <div className="text-muted p-4">No unified report available.</div>;

  // Extract data
  const { appInfo, tools, summary, findings, rawReports } = data;

  // Check tool modes (real vs simulated)
  const sonarMode = rawReports?.sonar?.mode || 'unknown';

  // Calculate overall security score
  const totalIssues = summary.totalIssues || 0;
  const weightedPenalty = (summary.critical * 20) + (summary.high * 10) + (summary.medium * 5) + (summary.low * 2) + (summary.info * 1);
  const maxPenalty = Math.max(totalIssues * 20, 1);
  const securityScore = Math.max(0, Math.round(100 - (weightedPenalty / maxPenalty) * 100));

  // Prepare chart data
  const severityData = [
    { name: 'Critical', value: summary.critical, color: SEVERITY_COLORS.critical },
    { name: 'High', value: summary.high, color: SEVERITY_COLORS.high },
    { name: 'Medium', value: summary.medium, color: SEVERITY_COLORS.medium },
    { name: 'Low', value: summary.low, color: SEVERITY_COLORS.low },
    { name: 'Info', value: summary.info, color: SEVERITY_COLORS.info },
  ].filter(d => d.value > 0);

  // Tool distribution
  const toolDistribution = findings.reduce((acc, f) => {
    acc[f.tool] = (acc[f.tool] || 0) + 1;
    return acc;
  }, {});

  const toolData = Object.entries(toolDistribution).map(([name, value]) => ({
    name,
    value,
    color: TOOL_COLORS[name] || "#999",
  }));

  // Category distribution (top 10)
  const categoryDistribution = findings.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {});

  const categoryData = Object.entries(categoryDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Radar chart data for security dimensions
  const radarData = [
    { dimension: 'Vulnerabilities', value: Math.max(0, 100 - (summary.critical + summary.high) * 10) },
    { dimension: 'Code Quality', value: Math.max(0, 100 - summary.medium * 5) },
    { dimension: 'Best Practices', value: Math.max(0, 100 - summary.low * 3) },
    { dimension: 'Performance', value: 75 }, // placeholder
    { dimension: 'Maintainability', value: 70 }, // placeholder
  ];

  // Categorize findings
  const criticalFindings = findings.filter(f => f.severity === 'critical');
  const highFindings = findings.filter(f => f.severity === 'high');
  const mediumFindings = findings.filter(f => f.severity === 'medium' || f.severity === 'warning');

  // SonarQube specific metrics
  const sonarMetrics = rawReports?.sonar?.measures;

  return (
    <div>
      {/* ========== HEADER: Security Score & App Info ========== */}
      <Card className="mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Card.Body>
          <Container>
            <Row className="align-items-center">
              <Col md={4} className="text-center">
                <h2 className="mb-3">Security Score</h2>
                <div style={{
                  fontSize: 64,
                  fontWeight: 900,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                  color: securityScore > 70 ? '#90ee90' : securityScore > 40 ? '#f4c542' : '#ff6b6b'
                }}>
                  {securityScore}
                </div>
                <div style={{ fontSize: 18 }}>out of 100</div>
                <ProgressBar
                  now={securityScore}
                  variant={securityScore > 70 ? 'success' : securityScore > 40 ? 'warning' : 'danger'}
                  className="mt-3"
                  style={{ height: 12 }}
                />
              </Col>

              <Col md={4} className="text-center">
                <h5>Issue Summary</h5>
                <Table bordered size="sm" className="text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <tbody>
                    <tr><td>Critical</td><td><strong>{summary.critical}</strong></td></tr>
                    <tr><td>High</td><td><strong>{summary.high}</strong></td></tr>
                    <tr><td>Medium</td><td><strong>{summary.medium}</strong></td></tr>
                    <tr><td>Low</td><td><strong>{summary.low}</strong></td></tr>
                    <tr><td>Info</td><td><strong>{summary.info}</strong></td></tr>
                    <tr style={{ background: 'rgba(255,255,255,0.2)' }}><td><strong>Total</strong></td><td><strong>{totalIssues}</strong></td></tr>
                  </tbody>
                </Table>
              </Col>

              <Col md={4}>
                {appInfo ? (
                  <>
                    <h5>App Information</h5>
                    <div className="mb-2"><strong>Name:</strong> {appInfo.name}</div>
                    <div className="mb-2"><strong>Package:</strong> <small>{appInfo.package}</small></div>
                    <div className="mb-2"><strong>Version:</strong> {appInfo.version}</div>
                    <div className="mb-2"><strong>Size:</strong> {appInfo.size}</div>
                    <div className="mb-2"><strong>MD5:</strong> <small>{appInfo.md5?.substring(0, 16)}...</small></div>
                  </>
                ) : (
                  <div>App info not available</div>
                )}
                <div className="mt-3">
                  <strong>Analysis Tools:</strong>
                  <div className="mt-2">
                    {tools.mobsf.available && <Badge bg="success" className="me-2" title="Real analysis">✓ MobSF (Real)</Badge>}
                    {tools.sonarQube.available && (
                      <Badge 
                        bg={sonarMode === 'real' ? 'success' : 'warning'}
                        text={sonarMode === 'real' ? 'white' : 'dark'}
                        className="me-2"
                        title={sonarMode === 'real' ? 'Real SonarQube analysis' : 'Simulated data - configure SONAR_HOST in .env for real analysis'}
                      >
                        ✓ SonarQube ({sonarMode === 'real' ? 'Real' : 'Simulated'})
                      </Badge>
                    )}
                  </div>
                  {sonarMode === 'simulated' && (
                    <div className="mt-2">
                      <small className="text-warning">
                        ⚠️ SonarQube is running in simulated mode. Configure SONAR_HOST in .env.
                      </small>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </Container>
        </Card.Body>
      </Card>

      {/* ========== TABS: Different Views ========== */}
      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="overview" title="📊 Overview">
          <Row>
            {/* Severity Distribution */}
            <Col md={6} className="mb-4">
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <Card.Title>Issues by Severity</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={severityData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {severityData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            {/* Tool Distribution */}
            <Col md={6} className="mb-4">
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <Card.Title>Issues by Tool</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={toolData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8">
                        {toolData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            {/* Category Distribution */}
            <Col md={6} className="mb-4">
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <Card.Title>Top Issue Categories</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#45b7d1" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            {/* Security Radar */}
            <Col md={6} className="mb-4">
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <Card.Title>Security Dimensions</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="dimension" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar name="Score" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* SonarQube Metrics (if available) */}
          {sonarMetrics && (
            <Card className="mb-4 shadow-sm">
              <Card.Body>
                <Card.Title>SonarQube Quality Metrics</Card.Title>
                <Row>
                  <Col md={3}>
                    <div className="text-center p-3">
                      <div style={{ fontSize: 32, fontWeight: 700, color: sonarMetrics.security_rating === 'A' ? 'green' : sonarMetrics.security_rating === 'B' ? 'orange' : 'red' }}>
                        {sonarMetrics.security_rating}
                      </div>
                      <div className="text-muted">Security Rating</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center p-3">
                      <div style={{ fontSize: 32, fontWeight: 700, color: sonarMetrics.reliability_rating === 'A' ? 'green' : sonarMetrics.reliability_rating === 'B' ? 'orange' : 'red' }}>
                        {sonarMetrics.reliability_rating}
                      </div>
                      <div className="text-muted">Reliability</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center p-3">
                      <div style={{ fontSize: 32, fontWeight: 700, color: sonarMetrics.coverage > 70 ? 'green' : sonarMetrics.coverage > 40 ? 'orange' : 'red' }}>
                        {sonarMetrics.coverage}%
                      </div>
                      <div className="text-muted">Code Coverage</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center p-3">
                      <div style={{ fontSize: 32, fontWeight: 700 }}>
                        {sonarMetrics.code_smells}
                      </div>
                      <div className="text-muted">Code Smells</div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </Tab>

        <Tab eventKey="findings" title="🔍 All Findings">
          <FindingsList findings={findings} title="All Security Findings" />
        </Tab>

        <Tab eventKey="critical" title={`🔥 Critical (${criticalFindings.length})`}>
          <FindingsList findings={criticalFindings} title="Critical Issues" severity="critical" />
        </Tab>

        <Tab eventKey="high" title={`⚠️ High (${highFindings.length})`}>
          <FindingsList findings={highFindings} title="High Severity Issues" severity="high" />
        </Tab>

        <Tab eventKey="medium" title={`⚡ Medium (${mediumFindings.length})`}>
          <FindingsList findings={mediumFindings} title="Medium Severity Issues" severity="medium" />
        </Tab>

        <Tab eventKey="bytool" title="📦 By Tool">
          <ByToolView findings={findings} />
        </Tab>
      </Tabs>
    </div>
  );
}

// Component: Findings List
function FindingsList({ findings, title, severity }) {
  if (!findings || findings.length === 0) {
    return (
      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title>{title}</Card.Title>
          <div className="text-muted">No issues found in this category.</div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Card.Title>{title} ({findings.length})</Card.Title>
        <Accordion>
          {findings.map((f, idx) => (
            <Accordion.Item eventKey={String(idx)} key={idx}>
              <Accordion.Header>
                <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                  <div>
                    <ToolBadge tool={f.tool} /> <strong>{short(f.title, 80)}</strong> <SeverityBadge severity={f.severity} />
                  </div>
                  <Badge bg="light" text="dark">{f.category}</Badge>
                </div>
              </Accordion.Header>
              <Accordion.Body>
                <div className="mb-2">
                  <strong>Description:</strong>
                  <div className="mt-1">{f.description || 'No description available'}</div>
                </div>
                {f.location && (
                  <div className="mb-2">
                    <strong>Location:</strong> <code>{f.location}</code>
                  </div>
                )}
                {f.remediation && (
                  <div className="mb-2">
                    <strong>Remediation:</strong>
                    <div className="mt-1" style={{ background: '#f8f9fa', padding: 10, borderRadius: 4 }}>
                      <em>{f.remediation}</em>
                    </div>
                  </div>
                )}
                {f.tags && f.tags.length > 0 && (
                  <div className="mb-2">
                    <strong>Tags:</strong> {f.tags.map((tag, i) => <Badge key={i} bg="secondary" className="me-1">{tag}</Badge>)}
                  </div>
                )}
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      </Card.Body>
    </Card>
  );
}

// Component: By Tool View
function ByToolView({ findings }) {
  const byTool = findings.reduce((acc, f) => {
    if (!acc[f.tool]) acc[f.tool] = [];
    acc[f.tool].push(f);
    return acc;
  }, {});

  return (
    <div>
      {Object.entries(byTool).map(([tool, items]) => (
        <Card key={tool} className="mb-4 shadow-sm">
          <Card.Body>
            <Card.Title>
              <ToolBadge tool={tool} /> {tool} - {items.length} findings
            </Card.Title>
            <ListGroup variant="flush">
              {items.slice(0, 20).map((f, idx) => (
                <ListGroup.Item key={idx}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div style={{ flex: 1 }}>
                      <strong>{f.title}</strong> <SeverityBadge severity={f.severity} />
                      <div className="small text-muted mt-1">{short(f.description, 150)}</div>
                      {f.location && <div className="small text-muted"><code>{f.location}</code></div>}
                    </div>
                    <Badge bg="light" text="dark">{f.category}</Badge>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
            {items.length > 20 && <div className="text-muted text-center mt-2">... and {items.length - 20} more</div>}
          </Card.Body>
        </Card>
      ))}
    </div>
  );
}
