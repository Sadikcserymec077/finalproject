// src/components/TagManager.js
import React, { useState, useEffect } from 'react';
import { Badge, Button, Form, InputGroup } from 'react-bootstrap';
import { addTag, removeTag, getAllTags, getReportMetadata } from '../api';

export default function TagManager({ hash }) {
  const [tags, setTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hash) {
      loadTags();
      loadAvailableTags();
    }
  }, [hash]);

  const loadTags = async () => {
    try {
      const res = await getReportMetadata(hash);
      setTags(res.data.tags || []);
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };

  const loadAvailableTags = async () => {
    try {
      const res = await getAllTags();
      setAvailableTags(res.data.tags || []);
    } catch (err) {
      console.error('Error loading available tags:', err);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    setLoading(true);
    try {
      await addTag(hash, newTag.trim());
      setNewTag('');
      loadTags();
      loadAvailableTags();
    } catch (err) {
      console.error('Error adding tag:', err);
      alert('Failed to add tag');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tag) => {
    setLoading(true);
    try {
      await removeTag(hash, tag);
      loadTags();
    } catch (err) {
      console.error('Error removing tag:', err);
      alert('Failed to remove tag');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-3">
      <div className="d-flex align-items-center gap-2 mb-2">
        <strong>Tags:</strong>
        {tags.length === 0 && <span className="text-muted small">No tags</span>}
        {tags.map(tag => (
          <Badge
            key={tag}
            bg="primary"
            style={{ cursor: 'pointer', fontSize: '0.85rem' }}
            onClick={() => handleRemoveTag(tag)}
            title="Click to remove"
          >
            {tag} ×
          </Badge>
        ))}
      </div>
      <InputGroup size="sm">
        <Form.Control
          type="text"
          placeholder="Add tag..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
          list="available-tags"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        />
        <datalist id="available-tags">
          {availableTags.filter(t => !tags.includes(t)).map(tag => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
        <Button
          variant="primary"
          onClick={handleAddTag}
          disabled={loading || !newTag.trim()}
        >
          Add
        </Button>
      </InputGroup>
    </div>
  );
}

