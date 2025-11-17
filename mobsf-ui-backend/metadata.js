/**
 * Metadata Storage System
 * SQLite-backed storage for report metadata (tags, favorites, annotations, etc.)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const METADATA_FILE = path.join(__dirname, 'metadata.json');

function migrateMetadataFile() {
  if (!fs.existsSync(METADATA_FILE)) return;
  const count = db.prepare('SELECT COUNT(*) AS count FROM report_metadata').get().count;
  if (count > 0) return;

  try {
    const data = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
    const reports = data?.reports || {};
    Object.entries(reports).forEach(([hash, report]) => {
      ensureReportRow(hash, {
        favorite: report.favorite,
        archived: report.archived,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt
      });
      setTagsForHash(hash, report.tags || []);
      (report.annotations || []).forEach(annotation => {
        db.prepare(
          `INSERT OR IGNORE INTO annotations (id, hash, text, type, created_at, created_by, finding_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          annotation.id || crypto.randomUUID(),
          hash,
          annotation.text,
          annotation.type || 'note',
          annotation.createdAt || new Date().toISOString(),
          annotation.createdBy || 'user',
          annotation.findingId || null
        );
      });
    });
    console.log(`✅ Migrated ${Object.keys(reports).length} metadata records from JSON to SQLite`);
  } catch (err) {
    console.error('Failed to migrate metadata.json:', err);
  }
}

function ensureReportRow(hash, initial = {}) {
  const existing = db.prepare('SELECT 1 FROM report_metadata WHERE hash = ?').get(hash);
  if (existing) return;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO report_metadata (hash, favorite, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    hash,
    initial.favorite ? 1 : 0,
    initial.archived ? 1 : 0,
    initial.createdAt || now,
    initial.updatedAt || now
  );
}

function getTagsForHash(hash) {
  return db.prepare(
    `SELECT tag FROM report_tags WHERE hash = ? ORDER BY tag COLLATE NOCASE ASC`
  ).all(hash).map(row => row.tag);
}

function setTagsForHash(hash, tags) {
  const normalized = Array.from(new Set((tags || [])
    .map(tag => tag?.trim())
    .filter(tag => !!tag)));
  const deleteStmt = db.prepare('DELETE FROM report_tags WHERE hash = ?');
  deleteStmt.run(hash);
  if (normalized.length === 0) return;
  const insertStmt = db.prepare('INSERT OR IGNORE INTO report_tags (hash, tag) VALUES (?, ?)');
  normalized.forEach(tag => insertStmt.run(hash, tag));
}

function getAnnotationsForHash(hash) {
  return db.prepare(
    `SELECT id, text, type, created_at AS createdAt, created_by AS createdBy, finding_id AS findingId
     FROM annotations
     WHERE hash = ?
     ORDER BY datetime(created_at) ASC`
  ).all(hash);
}

function bumpUpdatedAt(hash) {
  db.prepare('UPDATE report_metadata SET updated_at = ? WHERE hash = ?')
    .run(new Date().toISOString(), hash);
}

// Get report metadata
function getReportMetadata(hash) {
  migrateMetadataFile();
  ensureReportRow(hash);
  const row = db.prepare(
    `SELECT hash, favorite, archived, created_at AS createdAt, updated_at AS updatedAt
     FROM report_metadata WHERE hash = ?`
  ).get(hash);
  return {
    hash: row.hash,
    tags: getTagsForHash(hash),
    favorite: !!row.favorite,
    archived: !!row.archived,
    annotations: getAnnotationsForHash(hash),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

// Update report metadata
function updateReportMetadata(hash, updates) {
  migrateMetadataFile();
  ensureReportRow(hash);
  const fields = [];
  const params = [];

  if (typeof updates.favorite === 'boolean') {
    fields.push('favorite = ?');
    params.push(updates.favorite ? 1 : 0);
  }
  if (typeof updates.archived === 'boolean') {
    fields.push('archived = ?');
    params.push(updates.archived ? 1 : 0);
  }

  if (fields.length > 0) {
    params.push(new Date().toISOString(), hash);
    db.prepare(
      `UPDATE report_metadata SET ${fields.join(', ')}, updated_at = ? WHERE hash = ?`
    ).run(...params);
  } else {
    bumpUpdatedAt(hash);
  }

  if (Array.isArray(updates.tags)) {
    setTagsForHash(hash, updates.tags);
    bumpUpdatedAt(hash);
  }

  return getReportMetadata(hash);
}

// Add tag to report
function addTag(hash, tag) {
  migrateMetadataFile();
  ensureReportRow(hash);
  const trimmed = tag?.trim();
  if (!trimmed) return getReportMetadata(hash);
  db.prepare('INSERT OR IGNORE INTO report_tags (hash, tag) VALUES (?, ?)')
    .run(hash, trimmed);
  bumpUpdatedAt(hash);
  return getReportMetadata(hash);
}

// Remove tag from report
function removeTag(hash, tag) {
  migrateMetadataFile();
  ensureReportRow(hash);
  db.prepare('DELETE FROM report_tags WHERE hash = ? AND tag = ?').run(hash, tag);
  bumpUpdatedAt(hash);
  return getReportMetadata(hash);
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
  migrateMetadataFile();
  ensureReportRow(hash);
  const newAnnotation = {
    id: annotation.id || crypto.randomUUID(),
    text: annotation.text,
    type: annotation.type || 'note',
    createdAt: new Date().toISOString(),
    createdBy: annotation.createdBy || 'user',
    findingId: annotation.findingId || null
  };
  db.prepare(
    `INSERT INTO annotations (id, hash, text, type, created_at, created_by, finding_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newAnnotation.id,
    hash,
    newAnnotation.text,
    newAnnotation.type,
    newAnnotation.createdAt,
    newAnnotation.createdBy,
    newAnnotation.findingId
  );
  bumpUpdatedAt(hash);
  return newAnnotation;
}

// Delete annotation
function deleteAnnotation(hash, annotationId) {
  migrateMetadataFile();
  ensureReportRow(hash);
  db.prepare('DELETE FROM annotations WHERE id = ? AND hash = ?')
    .run(annotationId, hash);
  bumpUpdatedAt(hash);
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
  migrateMetadataFile();
  return db.prepare(
    `SELECT DISTINCT tag FROM report_tags ORDER BY tag COLLATE NOCASE ASC`
  ).all().map(row => row.tag);
}

// Get all favorites
function getAllFavorites() {
  migrateMetadataFile();
  return db.prepare(
    `SELECT hash FROM report_metadata WHERE favorite = 1 ORDER BY updated_at DESC`
  ).all().map(row => row.hash);
}

// Get all archived
function getAllArchived() {
  migrateMetadataFile();
  return db.prepare(
    `SELECT hash FROM report_metadata WHERE archived = 1 ORDER BY updated_at DESC`
  ).all().map(row => row.hash);
}

function loadMetadata() {
  migrateMetadataFile();
  const reports = {};
  const rows = db.prepare(
    `SELECT hash, favorite, archived, created_at AS createdAt, updated_at AS updatedAt FROM report_metadata`
  ).all();
  rows.forEach(row => {
    reports[row.hash] = {
      hash: row.hash,
      tags: getTagsForHash(row.hash),
      favorite: !!row.favorite,
      archived: !!row.archived,
      annotations: getAnnotationsForHash(row.hash),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  });
  return {
    reports,
    tags: getAllTags(),
    favorites: getAllFavorites(),
    archived: getAllArchived(),
    lastUpdated: new Date().toISOString()
  };
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

