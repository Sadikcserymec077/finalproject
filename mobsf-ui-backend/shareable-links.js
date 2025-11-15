/**
 * Shareable Links System
 * Generate secure shareable links for reports
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SHAREABLE_LINKS_FILE = path.join(__dirname, 'shareable-links.json');

// Initialize shareable links file
function initShareableLinks() {
  if (!fs.existsSync(SHAREABLE_LINKS_FILE)) {
    const initialData = {
      links: [],
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(SHAREABLE_LINKS_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

// Load shareable links
function loadShareableLinks() {
  initShareableLinks();
  try {
    const data = fs.readFileSync(SHAREABLE_LINKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading shareable links:', err);
    initShareableLinks();
    return loadShareableLinks();
  }
}

// Save shareable links
function saveShareableLinks(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(SHAREABLE_LINKS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Generate shareable link
function generateShareableLink(hash, options = {}) {
  const data = loadShareableLinks();
  
  // Generate unique token
  const token = crypto.randomBytes(32).toString('hex');
  
  const link = {
    token,
    hash,
    expiresAt: options.expiresAt || null, // null = never expires
    maxViews: options.maxViews || null, // null = unlimited
    views: 0,
    password: options.password ? crypto.createHash('sha256').update(options.password).digest('hex') : null,
    createdAt: new Date().toISOString(),
    createdBy: options.createdBy || 'system',
    accessCount: 0
  };

  data.links.push(link);
  saveShareableLinks(data);

  return {
    token,
    url: `${options.baseUrl || 'http://localhost:3000'}/shared/${token}`,
    expiresAt: link.expiresAt,
    maxViews: link.maxViews
  };
}

// Verify and access shareable link
function accessShareableLink(token, password = null) {
  const data = loadShareableLinks();
  const link = data.links.find(l => l.token === token);

  if (!link) {
    return { success: false, error: 'Invalid link' };
  }

  // Check expiration
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return { success: false, error: 'Link has expired' };
  }

  // Check max views
  if (link.maxViews && link.views >= link.maxViews) {
    return { success: false, error: 'Link has reached maximum views' };
  }

  // Check password
  if (link.password) {
    if (!password) {
      return { success: false, error: 'Password required', requiresPassword: true };
    }
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (passwordHash !== link.password) {
      return { success: false, error: 'Invalid password' };
    }
  }

  // Increment views
  link.views++;
  link.accessCount++;
  link.lastAccessed = new Date().toISOString();
  saveShareableLinks(data);

  return {
    success: true,
    hash: link.hash,
    views: link.views,
    maxViews: link.maxViews
  };
}

// Revoke shareable link
function revokeShareableLink(token) {
  const data = loadShareableLinks();
  const linkIndex = data.links.findIndex(l => l.token === token);

  if (linkIndex === -1) {
    return { success: false, error: 'Link not found' };
  }

  data.links.splice(linkIndex, 1);
  saveShareableLinks(data);

  return { success: true };
}

// Get link info
function getLinkInfo(token) {
  const data = loadShareableLinks();
  const link = data.links.find(l => l.token === token);

  if (!link) {
    return null;
  }

  return {
    token: link.token,
    hash: link.hash,
    expiresAt: link.expiresAt,
    maxViews: link.maxViews,
    views: link.views,
    createdAt: link.createdAt,
    lastAccessed: link.lastAccessed,
    hasPassword: !!link.password
  };
}

// Get all links for a hash
function getLinksForHash(hash) {
  const data = loadShareableLinks();
  return data.links
    .filter(l => l.hash === hash)
    .map(l => ({
      token: l.token,
      expiresAt: l.expiresAt,
      maxViews: l.maxViews,
      views: l.views,
      createdAt: l.createdAt,
      hasPassword: !!l.password
    }));
}

module.exports = {
  generateShareableLink,
  accessShareableLink,
  revokeShareableLink,
  getLinkInfo,
  getLinksForHash
};

