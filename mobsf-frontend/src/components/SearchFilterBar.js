// src/components/SearchFilterBar.js
import React, { useState, useEffect } from 'react';
import { Form, InputGroup, Button, Badge, Dropdown, Row, Col } from 'react-bootstrap';
import { searchReports, getAllTags } from '../api';

export default function SearchFilterBar({ onResults, onFilterChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    severity: '',
    dateFrom: '',
    dateTo: '',
    minScore: '',
    maxScore: '',
    tags: [],
    archived: '',
    favorite: ''
  });
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const res = await getAllTags();
      setAvailableTags(res.data.tags || []);
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };

  const handleSearch = async () => {
    try {
      const searchFilters = {
        query: searchQuery || undefined,
        severity: filters.severity || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        minScore: filters.minScore || undefined,
        maxScore: filters.maxScore || undefined,
        tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
        archived: filters.archived || undefined,
        favorite: filters.favorite || undefined
      };

      // Remove undefined values
      Object.keys(searchFilters).forEach(key => 
        searchFilters[key] === undefined && delete searchFilters[key]
      );

      const res = await searchReports(searchFilters);
      if (onResults) onResults(res.data.results || []);
      if (onFilterChange) onFilterChange(searchFilters);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setFilters({
      severity: '',
      dateFrom: '',
      dateTo: '',
      minScore: '',
      maxScore: '',
      tags: [],
      archived: '',
      favorite: ''
    });
    setSelectedTags([]);
    handleSearch();
  };

  const addTag = (tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tag) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  return (
    <div className="mb-4">
      <Row className="g-2">
        <Col md={8}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Search by app name, package, or hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px 0 0 10px'
              }}
            />
            <Button
              variant="primary"
              onClick={handleSearch}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '0 10px 10px 0'
              }}
            >
              🔍 Search
            </Button>
          </InputGroup>
        </Col>
        <Col md={4}>
          <Button
            variant="outline-secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="w-100"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
          >
            {showFilters ? '▲' : '▼'} Filters
          </Button>
        </Col>
      </Row>

      {showFilters && (
        <div className="mt-3 p-3" style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <Row className="g-3">
            <Col md={3}>
              <Form.Label className="small fw-bold">Severity</Form.Label>
              <Form.Select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                style={{
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <option value="">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Date From</Form.Label>
              <Form.Control
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                style={{
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Date To</Form.Label>
              <Form.Control
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                style={{
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Security Score</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
                  type="number"
                  placeholder="Min"
                  min="0"
                  max="100"
                  value={filters.minScore}
                  onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
                  style={{
                    background: 'var(--card-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                />
                <Form.Control
                  type="number"
                  placeholder="Max"
                  min="0"
                  max="100"
                  value={filters.maxScore}
                  onChange={(e) => setFilters({ ...filters, maxScore: e.target.value })}
                  style={{
                    background: 'var(--card-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                />
              </div>
            </Col>
            <Col md={4}>
              <Form.Label className="small fw-bold">Tags</Form.Label>
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  size="sm"
                  style={{
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    width: '100%'
                  }}
                >
                  Select Tags
                </Dropdown.Toggle>
                <Dropdown.Menu style={{
                  background: 'var(--card-bg)',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {availableTags.map(tag => (
                    <Dropdown.Item
                      key={tag}
                      onClick={() => addTag(tag)}
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {tag}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
              {selectedTags.length > 0 && (
                <div className="mt-2 d-flex flex-wrap gap-1">
                  {selectedTags.map(tag => (
                    <Badge
                      key={tag}
                      bg="primary"
                      style={{ cursor: 'pointer' }}
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </Col>
            <Col md={4}>
              <Form.Label className="small fw-bold">Status</Form.Label>
              <Form.Select
                value={filters.archived}
                onChange={(e) => setFilters({ ...filters, archived: e.target.value })}
                style={{
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <option value="">All</option>
                <option value="false">Active</option>
                <option value="true">Archived</option>
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label className="small fw-bold">Favorites</Form.Label>
              <Form.Select
                value={filters.favorite}
                onChange={(e) => setFilters({ ...filters, favorite: e.target.value })}
                style={{
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <option value="">All</option>
                <option value="true">Favorites Only</option>
              </Form.Select>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
}

