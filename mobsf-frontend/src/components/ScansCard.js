// src/components/ScansCard.js
import React, { useEffect, useState } from 'react';
import { Card, ListGroup, Button, Badge } from 'react-bootstrap';
import { getScans } from '../api';

export default function ScansCard({ onSelect, refreshKey }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchScans(); }, []); // initial load
  useEffect(() => { if (refreshKey !== undefined) fetchScans(); }, [refreshKey]); // refresh when key changes

  async function fetchScans() {
    setLoading(true);
    try {
      const r = await getScans(1, 10);
      setScans(r.data.content || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  return (
    <Card className="mb-3 shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Card.Title className="mb-0" style={{ fontWeight: 700, fontSize: '1.2rem' }}>
            <span style={{ fontSize: '1.3rem', marginRight: '8px' }}>📋</span>
            Recent Scans
          </Card.Title>
          <Button 
            variant="link" 
            size="sm" 
            onClick={fetchScans} 
            disabled={loading}
            style={{ 
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: '8px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {loading ? '⏳' : '🔄'} {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
        <ListGroup variant="flush">
          {scans.length === 0 && (
            <div className="text-center p-4 text-muted">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <div>No recent scans</div>
              <small>Upload an APK to get started</small>
            </div>
          )}
          {scans.map((s, idx) => (
            <ListGroup.Item 
              key={s.MD5 || s.id} 
              className="d-flex justify-content-between align-items-start" 
              style={{ 
                background: 'var(--card-bg)', 
                color: 'var(--text-primary)', 
                borderColor: 'var(--border-color)',
                borderRadius: '12px',
                marginBottom: '8px',
                padding: '1rem',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                border: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--card-bg)';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => onSelect && onSelect(s)}
            >
              <div style={{ flex: 1 }}>
                <div className="fw-bold mb-1" style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {s.APP_NAME || s.FILE_NAME}
                </div>
                <div className="text-muted small mb-1" style={{ fontFamily: 'monospace' }}>
                  {s.PACKAGE_NAME}
                </div>
                <div className="text-muted small d-flex align-items-center gap-2">
                  <span>v{s.VERSION_NAME || '?'}</span>
                  <span>•</span>
                  <span>{new Date(s.TIMESTAMP).toLocaleString()}</span>
                </div>
              </div>
              <div className="text-end d-flex flex-column align-items-end gap-2">
                <Button 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect && onSelect(s);
                  }}
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 16px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  Open
                </Button>
                <Badge 
                  bg="secondary"
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}
                >
                  {s.SCAN_TYPE}
                </Badge>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
}
