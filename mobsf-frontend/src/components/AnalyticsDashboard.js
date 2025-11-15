// src/components/AnalyticsDashboard.js
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Table } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getAnalyticsDashboard } from '../api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await getAnalyticsDashboard();
      setStats(res.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-3 shadow-sm">
        <Card.Body className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (!stats) return null;

  const severityData = [
    { name: 'Critical', value: stats.severityBreakdown.critical, color: '#dc3545' },
    { name: 'High', value: stats.severityBreakdown.high, color: '#fd7e14' },
    { name: 'Medium', value: stats.severityBreakdown.medium, color: '#ffc107' },
    { name: 'Low', value: stats.severityBreakdown.low, color: '#0dcaf0' },
    { name: 'Info', value: stats.severityBreakdown.info, color: '#6c757d' }
  ].filter(d => d.value > 0);

  const scoreDistributionData = [
    { name: 'Excellent (80+)', value: stats.scoreDistribution.excellent },
    { name: 'Good (60-79)', value: stats.scoreDistribution.good },
    { name: 'Fair (40-59)', value: stats.scoreDistribution.fair },
    { name: 'Poor (<40)', value: stats.scoreDistribution.poor }
  ];

  const topVulnsData = Object.entries(stats.topVulnerabilities)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return (
    <div>
      <h3 className="mb-4" style={{ fontWeight: 700 }}>
        <span style={{ fontSize: '2rem', marginRight: '12px' }}>📊</span>
        Analytics Dashboard
      </h3>

      {/* Summary Cards */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <Card.Body>
              <div className="small">Total Reports</div>
              <div className="h3 mb-0">{stats.totalReports}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <Card.Body>
              <div className="small">Total Findings</div>
              <div className="h3 mb-0">{stats.totalFindings}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <Card.Body>
              <div className="small">Average Score</div>
              <div className="h3 mb-0">{stats.averageScore}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <Card.Body>
              <div className="small">Critical Issues</div>
              <div className="h3 mb-0">{stats.severityBreakdown.critical}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
            <Card.Header className="fw-bold">Severity Breakdown</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
            <Card.Header className="fw-bold">Score Distribution</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Top Vulnerabilities - Chart */}
      <Row className="g-3 mb-4">
        <Col md={8}>
          <Card style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
            <Card.Header className="fw-bold">Top 10 Most Common Vulnerabilities - Chart</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topVulnsData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={250}
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={0}
                    textAnchor="end"
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
            <Card.Header className="fw-bold">Recent Activity</Card.Header>
            <Card.Body>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {stats.recentActivity.slice(0, 10).map((activity, idx) => (
                  <div key={idx} className="mb-3 pb-3 border-bottom">
                    <div className="fw-bold small">{activity.appName}</div>
                    <div className="text-muted small">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </div>
                    <Badge bg={activity.score >= 70 ? 'success' : activity.score >= 40 ? 'warning' : 'danger'}>
                      Score: {activity.score}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Top Vulnerabilities - Separate Card with Table */}
      <Row className="g-3 mb-4">
        <Col md={12}>
          <Card style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
            <Card.Header className="fw-bold">📋 Top 10 Most Common Vulnerabilities - Detailed List</Card.Header>
            <Card.Body>
              <Table striped hover responsive style={{ color: 'var(--text-primary)' }}>
                <thead>
                  <tr>
                    <th style={{ width: '10%' }}>#</th>
                    <th style={{ width: '70%' }}>Vulnerability Name</th>
                    <th className="text-center" style={{ width: '20%' }}>Occurrences</th>
                  </tr>
                </thead>
                <tbody>
                  {topVulnsData.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center text-muted">No vulnerabilities found</td>
                    </tr>
                  ) : (
                    topVulnsData.map((item, idx) => (
                      <tr key={idx}>
                        <td><Badge bg="secondary">{idx + 1}</Badge></td>
                        <td style={{ wordBreak: 'break-word', padding: '12px' }}>
                          <strong>{item.name}</strong>
                        </td>
                        <td className="text-center">
                          <Badge bg="primary" style={{ fontSize: '1rem', padding: '6px 12px' }}>
                            {item.count}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Trend Chart */}
      {stats.trendData.length > 0 && (
        <Card className="mb-3" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
          <Card.Header className="fw-bold">Security Score Trend</Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#8884d8" name="Security Score" />
              </LineChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

