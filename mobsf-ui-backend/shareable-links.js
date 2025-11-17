/**
 * Shareable Links System
 * Generate secure shareable links for reports
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const SHAREABLE_LINKS_FILE = path.join(__dirname, 'shareable-links.json');

function migrateShareableLinksFile() {
  if (!fs.existsSync(SHAREABLE_LINKS_FILE)) return;
  const count = db.prepare('SELECT COUNT(*) AS count FROM shareable_links').get().count;
  if (count > 0) return;

  try {
    const fileData = JSON.parse(fs.readFileSync(SHAREABLE_LINKS_FILE, 'utf8'));
    const links = fileData?.links || [];
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO shareable_links
      (token, hash, expires_at, max_views, views, password_hash, created_at, created_by, access_count, last_accessed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    links.forEach(link => {
      stmt.run(
        link.token,
        link.hash,
        link.expiresAt || null,
        link.maxViews ?? null,
        link.views || 0,
        link.password || null,
        link.createdAt || new Date().toISOString(),
        link.createdBy || 'system',
        link.accessCount || 0,
        link.lastAccessed || null
      );
    });
    console.log(`✅ Migrated ${links.length} shareable links from JSON to SQLite`);
  } catch (err) {
    console.error('Failed to migrate shareable-links.json:', err);
  }
}

// Generate shareable link
function generateShareableLink(hash, options = {}) {
  migrateShareableLinksFile();
  
  // Generate unique token
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  const passwordHash = options.password
    ? crypto.createHash('sha256').update(options.password).digest('hex')
    : null;
  
  db.prepare(
    `INSERT INTO shareable_links
     (token, hash, expires_at, max_views, views, password_hash, created_at, created_by, access_count)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0)`
  ).run(
    token,
    hash,
    options.expiresAt || null,
    options.maxViews ?? null,
    passwordHash,
    now,
    options.createdBy || 'system'
  );

  return {
    token,
    url: `${options.baseUrl || 'http://localhost:3000'}/shared/${token}`,
    expiresAt: options.expiresAt || null,
    maxViews: options.maxViews ?? null
  };
}

// Verify and access shareable link
function accessShareableLink(token, password = null) {
  migrateShareableLinksFile();
  const link = db.prepare('SELECT * FROM shareable_links WHERE token = ?').get(token);

  if (!link) {
    return { success: false, error: 'Invalid link' };
  }

  // Check expiration
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return { success: false, error: 'Link has expired' };
  }

  // Check max views
  if (link.max_views && link.views >= link.max_views) {
    return { success: false, error: 'Link has reached maximum views' };
  }

  // Check password
  if (link.password_hash) {
    if (!password) {
      return { success: false, error: 'Password required', requiresPassword: true };
    }
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (passwordHash !== link.password_hash) {
      return { success: false, error: 'Invalid password' };
    }
  }

  // Increment views
  db.prepare(
    `UPDATE shareable_links
     SET views = views + 1,
         access_count = access_count + 1,
         last_accessed = ?
     WHERE token = ?`
  ).run(new Date().toISOString(), token);

  return {
    success: true,
    hash: link.hash,
    views: link.views + 1,
    maxViews: link.max_views
  };
}

// Revoke shareable link
function revokeShareableLink(token) {
  migrateShareableLinksFile();
  const info = db.prepare('SELECT token FROM shareable_links WHERE token = ?').get(token);
  if (!info) {
    return { success: false, error: 'Link not found' };
  }

  db.prepare('DELETE FROM shareable_links WHERE token = ?').run(token);

  return { success: true };
}

// Get link info
function getLinkInfo(token) {
  migrateShareableLinksFile();
  const link = db.prepare('SELECT * FROM shareable_links WHERE token = ?').get(token);

  if (!link) {
    return null;
  }

  return {
    token: link.token,
    hash: link.hash,
    expiresAt: link.expires_at,
    maxViews: link.max_views,
    views: link.views,
    createdAt: link.created_at,
    lastAccessed: link.last_accessed,
    hasPassword: !!link.password_hash
  };
}

// Get all links for a hash
function getLinksForHash(hash) {
  migrateShareableLinksFile();
  return db.prepare(
    `SELECT token, expires_at AS expiresAt, max_views AS maxViews, views,
            created_at AS createdAt, password_hash
     FROM shareable_links
     WHERE hash = ?
     ORDER BY created_at DESC`
  ).all(hash).map(row => ({
    token: row.token,
    expiresAt: row.expiresAt,
    maxViews: row.maxViews,
    views: row.views,
    createdAt: row.createdAt,
    hasPassword: !!row.password_hash
  }));
}

module.exports = {
  generateShareableLink,
  accessShareableLink,
  revokeShareableLink,
  getLinkInfo,
  getLinksForHash
};

