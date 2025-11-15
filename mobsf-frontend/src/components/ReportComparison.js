// src/components/ReportComparison.js
import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Row, Col, Table, Alert } from 'react-bootstrap';
import { compareReports, getScans } from '../api';

export default function ReportComparison({ hash1, hash2, onClose }) {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableScans, setAvailableScans] = useState([]);
  const [selectedHash1, setSelectedHash1] = useState(hash1);
  const [selectedHash2, setSelectedHash2] = useState(hash2);

  useEffect(() => {
    loadAvailableScans();
    if (hash1 && hash2) {
      loadComparison(hash1, hash2);
    }
  }, []);

  const loadAvailableScans = async () => {
    try {
      const res = await getScans(1, 100);
      setAvailableScans(res.data.content || []);
    } catch (err) {
      console.error('Error loading scans:', err);
    }
  };

  const loadComparison = async (h1, h2) => {
    setLoading(true);
    setError(null);
    try {
      const res = await compareReports(h1, h2);
      setComparison(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = () => {
    if (selectedHash1 && selectedHash2) {
      loadComparison(selectedHash1, selectedHash2);
    }
  };

  if (!hash1 || !hash2) {
    return (
      <Card className="mb-3 shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
        <Card.Body>
          <h4 className="mb-3">Compare Reports</h4>
          <Row className="g-3 mb-3">
            <Col md={5}>
              <label className="small fw-bold mb-2">Select First Report</label>
              <select
                className="form-select"
                value={selectedHash1 || ''}
                onChange={(e) => setSelectedHash1(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <option value="">-- Select Report --</option>
                {availableScans.map(scan => (
                  <option key={scan.MD5} value={scan.MD5}>
                    {scan.APP_NAME} ({scan.MD5.substring(0, 8)}...)
                  </option>
                ))}
              </select>
            </Col>
            <Col md={5}>
              <label className="small fw-bold mb-2">Select Second Report</label>
              <select
                className="form-select"
                value={selectedHash2 || ''}
                onChange={(e) => setSelectedHash2(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <option value="">-- Select Report --</option>
                {availableScans.map(scan => (
                  <option key={scan.MD5} value={scan.MD5}>
                    {scan.APP_NAME} ({scan.MD5.substring(0, 8)}...)
                  </option>
                ))}
              </select>
            </Col>
            <Col md={2}>
              <Button
                variant="primary"
                onClick={handleCompare}
                disabled={!selectedHash1 || !selectedHash2 || selectedHash1 === selectedHash2}
                className="w-100"
                style={{ marginTop: '1.8rem' }}
              >
                Compare
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="mb-3 shadow-sm">
        <Card.Body className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="mt-3">Loading comparison...</div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        {onClose && <Button onClick={onClose}>Close</Button>}
      </Alert>
    );
  }

  if (!comparison) return null;

  const { report1, report2, differences, scoreChange } = comparison;

  return (
    <div>
      <Card className="mb-3 shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="mb-0">📊 Report Comparison</h4>
            {onClose && <Button variant="outline-secondary" onClick={onClose}>Close</Button>}
          </div>

          {/* Summary Cards */}
          <Row className="g-3 mb-4">
            <Col md={6}>
              <Card style={{ background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)', color: 'white' }}>
                <Card.Body>
                  <h6>Report 1</h6>
                  <div className="fw-bold">{report1.appInfo?.name || 'Unknown'}</div>
                  <div className="small">{report1.appInfo?.package}</div>
                  <div className="mt-2">
                    <Badge bg="light" text="dark">Score: {scoreChange.report1}</Badge>
                    <Badge bg="light" text="dark" className="ms-2">Findings: {report1.findingsCount}</Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card style={{ background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)', color: 'white' }}>
                <Card.Body>
                  <h6>Report 2</h6>
                  <div className="fw-bold">{report2.appInfo?.name || 'Unknown'}</div>
                  <div className="small">{report2.appInfo?.package}</div>
                  <div className="mt-2">
                    <Badge bg="light" text="dark">Score: {scoreChange.report2}</Badge>
                    <Badge bg="light" text="dark" className="ms-2">Findings: {report2.findingsCount}</Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Score Change */}
          <Alert variant={scoreChange.improvement >= 0 ? 'success' : 'warning'} className="mb-4">
            <Alert.Heading>
              Security Score Change: {scoreChange.improvement >= 0 ? '+' : ''}{scoreChange.improvement} points
            </Alert.Heading>
            <p className="mb-0">
              {scoreChange.improvement > 0 
                ? '✅ Security has improved!'
                : scoreChange.improvement < 0
                ? '⚠️ Security has decreased'
                : '➡️ No change in security score'}
            </p>
          </Alert>

          {/* New Findings */}
          {differences.newFindings.length > 0 && (
            <Card className="mb-3" style={{ background: 'var(--bg-secondary)' }}>
              <Card.Header className="fw-bold text-danger">
                🆕 New Findings ({differences.newFindings.length})
              </Card.Header>
              <Card.Body>
                <Table striped hover size="sm" style={{ color: 'var(--text-primary)' }}>
                  <thead>
                    <tr>
                      <th>Tool</th>
                      <th>Category</th>
                      <th>Title</th>
                      <th>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {differences.newFindings.slice(0, 10).map((finding, idx) => (
                      <tr key={idx}>
                        <td>{finding.tool}</td>
                        <td>{finding.category}</td>
                        <td>{finding.title}</td>
                        <td>
                          <Badge bg={
                            finding.severity === 'critical' ? 'danger' :
                            finding.severity === 'high' ? 'warning' :
                            finding.severity === 'medium' ? 'info' : 'secondary'
                          }>
                            {finding.severity}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {differences.newFindings.length > 10 && (
                  <div className="text-muted small">... and {differences.newFindings.length - 10} more</div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Resolved Findings */}
          {differences.resolvedFindings.length > 0 && (
            <Card className="mb-3" style={{ background: 'var(--bg-secondary)' }}>
              <Card.Header className="fw-bold text-success">
                ✅ Resolved Findings ({differences.resolvedFindings.length})
              </Card.Header>
              <Card.Body>
                <Table striped hover size="sm" style={{ color: 'var(--text-primary)' }}>
                  <thead>
                    <tr>
                      <th>Tool</th>
                      <th>Category</th>
                      <th>Title</th>
                      <th>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {differences.resolvedFindings.slice(0, 10).map((finding, idx) => (
                      <tr key={idx}>
                        <td>{finding.tool}</td>
                        <td>{finding.category}</td>
                        <td>{finding.title}</td>
                        <td>
                          <Badge bg="secondary">{finding.severity}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {differences.resolvedFindings.length > 10 && (
                  <div className="text-muted small">... and {differences.resolvedFindings.length - 10} more</div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Changed Severity */}
          {differences.changedSeverity.length > 0 && (
            <Card className="mb-3" style={{ background: 'var(--bg-secondary)' }}>
              <Card.Header className="fw-bold text-info">
                🔄 Changed Severity ({differences.changedSeverity.length})
              </Card.Header>
              <Card.Body>
                <Table striped hover size="sm" style={{ color: 'var(--text-primary)' }}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Old Severity</th>
                      <th>New Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {differences.changedSeverity.map((finding, idx) => (
                      <tr key={idx}>
                        <td>{finding.title}</td>
                        <td><Badge bg="secondary">{finding.oldSeverity}</Badge></td>
                        <td><Badge bg="primary">{finding.newSeverity}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}

          {differences.newFindings.length === 0 && 
           differences.resolvedFindings.length === 0 && 
           differences.changedSeverity.length === 0 && (
            <Alert variant="info">No differences found between the two reports.</Alert>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

