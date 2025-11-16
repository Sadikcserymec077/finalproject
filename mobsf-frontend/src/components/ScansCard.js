// src/components/ScansCard.js
import React, { useEffect, useState } from 'react';
import { Card, ListGroup, Button, Badge } from 'react-bootstrap';
import { getScans, deleteReport, archiveReport, unarchiveReport, toggleFavorite, getReportMetadata } from '../api';

export default function ScansCard({ onSelect, refreshKey }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchScans(); }, []); // initial load
  useEffect(() => { if (refreshKey !== undefined) fetchScans(); }, [refreshKey]); // refresh when key changes

  async function fetchScans() {
    setLoading(true);
    try {
      const r = await getScans(1, 100);
      // Enrich with metadata - security score is already calculated by backend
      const enriched = await Promise.all((r.data.content || []).map(async (scan) => {
        const hash = scan.MD5 || scan.hash || scan.md5;
        try {
          const metaRes = await getReportMetadata(hash);
          return { 
            ...scan, 
            hash, 
            metadata: metaRes.data,
            securityScore: scan.securityScore // Already calculated by backend
          };
        } catch {
          return { 
            ...scan, 
            hash, 
            metadata: { tags: [], favorite: false, archived: false },
            securityScore: scan.securityScore // Already calculated by backend
          };
        }
      }));
      setScans(enriched);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }


  const handleDelete = async (hash, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await deleteReport(hash);
        // Refresh the list
        await fetchScans();
      } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to delete report: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleArchive = async (hash, e) => {
    e.stopPropagation();
    try {
      const scan = scans.find(s => (s.MD5 || s.hash) === hash);
      if (scan?.metadata?.archived) {
        await unarchiveReport(hash);
      } else {
        await archiveReport(hash);
      }
      fetchScans();
    } catch (err) {
      console.error('Archive error:', err);
    }
  };

  const handleFavorite = async (hash, e) => {
    e.stopPropagation();
    try {
      await toggleFavorite(hash);
      fetchScans();
    } catch (err) {
      console.error('Favorite error:', err);
    }
  };


  return (
    <div>
    <Card className="mb-3 shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Card.Title className="mb-0" style={{ fontWeight: 700, fontSize: '1.2rem' }}>
            <span style={{ fontSize: '1.3rem', marginRight: '8px' }}>📋</span>
              Recent Scans
          </Card.Title>
            <div className="d-flex gap-2">
          <Button 
            variant="link" 
            size="sm" 
                onClick={() => { fetchScans(); }} 
            disabled={loading}
            style={{ 
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: '8px',
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? '⏳' : '🔄'} {loading ? 'Loading...' : 'Refresh'}
          </Button>
            </div>
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
                  <div className="fw-bold mb-1 d-flex align-items-center gap-2" style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {s.APP_NAME || s.FILE_NAME}
                    {s.metadata?.favorite && <span>⭐</span>}
                    {s.metadata?.archived && <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>Archived</Badge>}
                             {s.securityScore !== null && s.securityScore !== undefined && (
                               <Badge bg={s.securityScore >= 70 ? 'success' : s.securityScore >= 40 ? 'warning' : 'danger'}>
                                 Score: {s.securityScore}
                               </Badge>
                             )}
                </div>
                <div className="text-muted small mb-1" style={{ fontFamily: 'monospace' }}>
                  {s.PACKAGE_NAME}
                </div>
                  <div className="text-muted small d-flex align-items-center gap-2 flex-wrap">
                  <span>v{s.VERSION_NAME || '?'}</span>
                  <span>•</span>
                  <span>{new Date(s.TIMESTAMP).toLocaleString()}</span>
                    {s.metadata?.tags && s.metadata.tags.length > 0 && (
                      <>
                        <span>•</span>
                        {s.metadata.tags.map(tag => (
                          <Badge key={tag} bg="info" style={{ fontSize: '0.65rem' }}>{tag}</Badge>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              <div className="text-end d-flex flex-column align-items-end gap-2">
                <div className="d-flex gap-1">
                  <Button
                    size="sm"
                    variant={s.metadata?.favorite ? 'warning' : 'outline-secondary'}
                    onClick={(e) => handleFavorite(s.hash || s.MD5, e)}
                    title="Toggle Favorite"
                  >
                    ⭐
                  </Button>
                  <Button
                    size="sm"
                    variant={s.metadata?.archived ? 'info' : 'outline-secondary'}
                    onClick={(e) => handleArchive(s.hash || s.MD5, e)}
                    title={s.metadata?.archived ? 'Unarchive' : 'Archive'}
                  >
                    {s.metadata?.archived ? '📦' : '📁'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={(e) => handleDelete(s.hash || s.MD5, e)}
                    title="Delete"
                  >
                    🗑️
                  </Button>
                </div>
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
    </div>
  );
}
