/**
 * Authentication System
 * Simple JWT-based authentication for multi-user support
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const USERS_FILE = path.join(__dirname, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function migrateUsersFile() {
  if (!fs.existsSync(USERS_FILE)) return;
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount > 0) return;

  try {
    const fileData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const users = fileData?.users || [];
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO users (username, password, email, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    users.forEach(user => {
      const timestamp = user.createdAt || new Date().toISOString();
      stmt.run(
        user.username,
        user.password,
        user.email || null,
        user.role || 'user',
        timestamp,
        user.updatedAt || timestamp
      );
    });
    console.log(`✅ Migrated ${users.length} users from users.json to SQLite`);
  } catch (err) {
    console.error('Failed to migrate users.json:', err);
  }
}

// Initialize users table with default admin
function initUsers() {
  migrateUsersFile();
  const count = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (count === 0) {
    const timestamp = new Date().toISOString();
    const stmt = db.prepare(
      `INSERT INTO users (username, password, email, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      'admin',
      bcrypt.hashSync('admin', 10),
      'admin@example.com',
      'admin',
      timestamp,
      timestamp
    );
    console.log('✅ Created default admin user (admin/admin) in SQLite');
  }
}

// Create user
function createUser(username, password, email, role = 'user') {
  initUsers();
  const existing = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (existing) {
    return { success: false, error: 'Username already exists' };
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const timestamp = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (username, password, email, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(username, hashedPassword, email || null, role, timestamp, timestamp);

  return { success: true, user: { username, email, role } };
}

// Authenticate user
function authenticateUser(username, password) {
  initUsers();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return { success: false, error: 'Invalid credentials' };
  }

  // Generate JWT token
  const token = jwt.sign(
    { username: user.username, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    success: true,
    token,
    user: {
      username: user.username,
      email: user.email,
      role: user.role
    }
  };
}

// Verify token
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, user: decoded };
  } catch (err) {
    return { success: false, error: 'Invalid token' };
  }
}

// Middleware for protected routes
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const result = verifyToken(token);

  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  req.user = result.user;
  next();
}

// Middleware for admin routes
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Change password
function changePassword(username, oldPassword, newPassword) {
  initUsers();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return { success: false, error: 'Invalid old password' };
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare(
    `UPDATE users SET password = ?, updated_at = ? WHERE username = ?`
  ).run(hashed, new Date().toISOString(), username);

  return { success: true };
}

// Get all users (admin only)
function getAllUsers() {
  initUsers();
  return db.prepare(
    `SELECT username, email, role, created_at AS createdAt FROM users ORDER BY created_at ASC`
  ).all();
}

module.exports = {
  createUser,
  authenticateUser,
  verifyToken,
  requireAuth,
  requireAdmin,
  changePassword,
  getAllUsers,
  JWT_SECRET
};

