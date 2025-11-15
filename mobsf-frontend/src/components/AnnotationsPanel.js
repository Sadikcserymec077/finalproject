// src/components/AnnotationsPanel.js
import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Badge, ListGroup } from 'react-bootstrap';
import { addAnnotation, deleteAnnotation, getReportMetadata } from '../api';

export default function AnnotationsPanel({ hash }) {
  const [annotations, setAnnotations] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hash) {
      loadAnnotations();
    }
  }, [hash]);

  const loadAnnotations = async () => {
    try {
      const res = await getReportMetadata(hash);
      setAnnotations(res.data.annotations || []);
    } catch (err) {
      console.error('Error loading annotations:', err);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setLoading(true);
    try {
      await addAnnotation(hash, { text: newNote.trim(), type: 'note' });
      setNewNote('');
      loadAnnotations();
    } catch (err) {
      console.error('Error adding annotation:', err);
      alert('Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    setLoading(true);
    try {
      await deleteAnnotation(hash, id);
      loadAnnotations();
    } catch (err) {
      console.error('Error deleting annotation:', err);
      alert('Failed to delete note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-3" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
      <Card.Header className="fw-bold">📝 Notes & Annotations</Card.Header>
      <Card.Body>
        <Form className="mb-3">
          <Form.Group>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Add a note or comment about this report..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            />
          </Form.Group>
          <Button
            variant="primary"
            onClick={handleAddNote}
            disabled={loading || !newNote.trim()}
            size="sm"
          >
            Add Note
          </Button>
        </Form>

        {annotations.length === 0 ? (
          <div className="text-center text-muted p-3">
            No annotations yet. Add a note above.
          </div>
        ) : (
          <ListGroup variant="flush">
            {annotations.map(annotation => (
              <ListGroup.Item
                key={annotation.id}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div style={{ flex: 1 }}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <Badge bg={
                        annotation.type === 'false_positive' ? 'warning' :
                        annotation.type === 'review' ? 'info' : 'secondary'
                      }>
                        {annotation.type}
                      </Badge>
                      <small className="text-muted">
                        {new Date(annotation.createdAt).toLocaleString()}
                      </small>
                    </div>
                    <div>{annotation.text}</div>
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDeleteNote(annotation.id)}
                    disabled={loading}
                  >
                    ×
                  </Button>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
}

