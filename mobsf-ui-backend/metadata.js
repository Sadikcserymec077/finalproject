/**
 * Metadata Storage System
 * Simple JSON-based storage for report metadata (tags, favorites, annotations, etc.)
 */

const fs = require('fs');
const path = require('path');

const METADATA_FILE = path.join(__dirname, 'metadata.json');

// Initialize metadata file if it doesn't exist
function initMetadata() {
  if (!fs.existsSync(METADATA_FILE)) {
    const initialData = {
      reports: {},
      tags: [],
      favorites: [],
      annotations: {},
      archived: [],
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(METADATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

// Load metadata
function loadMetadata() {
  initMetadata();
  try {
    const data = fs.readFileSync(METADATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading metadata:', err);
    initMetadata();
    return loadMetadata();
  }
}

// Save metadata
function saveMetadata(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Get report metadata
function getReportMetadata(hash) {
  const metadata = loadMetadata();
  return metadata.reports[hash] || {
    hash,
    tags: [],
    favorite: false,
    archived: false,
    annotations: [],
    createdAt: null,
    updatedAt: null
  };
}

// Update report metadata
function updateReportMetadata(hash, updates) {
  const metadata = loadMetadata();
  if (!metadata.reports[hash]) {
    metadata.reports[hash] = {
      hash,
      tags: [],
      favorite: false,
      archived: false,
      annotations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  Object.assign(metadata.reports[hash], updates, {
    updatedAt: new Date().toISOString()
  });
  saveMetadata(metadata);
  return metadata.reports[hash];
}

// Add tag to report
function addTag(hash, tag) {
  const metadata = loadMetadata();
  const report = getReportMetadata(hash);
  if (!report.tags.includes(tag)) {
    report.tags.push(tag);
    updateReportMetadata(hash, { tags: report.tags });
  }
  if (!metadata.tags.includes(tag)) {
    metadata.tags.push(tag);
    saveMetadata(metadata);
  }
}

// Remove tag from report
function removeTag(hash, tag) {
  const report = getReportMetadata(hash);
  report.tags = report.tags.filter(t => t !== tag);
  updateReportMetadata(hash, { tags: report.tags });
}

// Toggle favorite
function toggleFavorite(hash) {
  const report = getReportMetadata(hash);
  const newFavorite = !report.favorite;
  updateReportMetadata(hash, { favorite: newFavorite });
  return newFavorite;
}

// Archive report
function archiveReport(hash) {
  updateReportMetadata(hash, { archived: true });
}

// Unarchive report
function unarchiveReport(hash) {
  updateReportMetadata(hash, { archived: false });
}

// Add annotation
function addAnnotation(hash, annotation) {
  const report = getReportMetadata(hash);
  const newAnnotation = {
    id: Date.now().toString(),
    text: annotation.text,
    type: annotation.type || 'note', // 'note', 'false_positive', 'review'
    createdAt: new Date().toISOString(),
    createdBy: annotation.createdBy || 'user'
  };
  report.annotations.push(newAnnotation);
  updateReportMetadata(hash, { annotations: report.annotations });
  return newAnnotation;
}

// Delete annotation
function deleteAnnotation(hash, annotationId) {
  const report = getReportMetadata(hash);
  report.annotations = report.annotations.filter(a => a.id !== annotationId);
  updateReportMetadata(hash, { annotations: report.annotations });
}

// Mark finding as false positive
function markFalsePositive(hash, findingId) {
  addAnnotation(hash, {
    text: `Marked finding ${findingId} as false positive`,
    type: 'false_positive',
    findingId
  });
}

// Get all tags
function getAllTags() {
  const metadata = loadMetadata();
  return metadata.tags || [];
}

// Get all favorites
function getAllFavorites() {
  const metadata = loadMetadata();
  return Object.values(metadata.reports)
    .filter(r => r.favorite)
    .map(r => r.hash);
}

// Get all archived
function getAllArchived() {
  const metadata = loadMetadata();
  return Object.values(metadata.reports)
    .filter(r => r.archived)
    .map(r => r.hash);
}

module.exports = {
  getReportMetadata,
  updateReportMetadata,
  addTag,
  removeTag,
  toggleFavorite,
  archiveReport,
  unarchiveReport,
  addAnnotation,
  deleteAnnotation,
  markFalsePositive,
  getAllTags,
  getAllFavorites,
  getAllArchived,
  loadMetadata
};

