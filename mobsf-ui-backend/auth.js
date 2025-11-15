/**
 * Authentication System
 * Simple JWT-based authentication for multi-user support
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Initialize users file
function initUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUser = {
      username: 'admin',
      password: bcrypt.hashSync('admin', 10), // Default password: admin
      email: 'admin@example.com',
      role: 'admin',
      createdAt: new Date().toISOString()
    };

    const users = {
      users: [defaultUser],
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  }
}

// Load users
function loadUsers() {
  initUsers();
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading users:', err);
    initUsers();
    return loadUsers();
  }
}

// Save users
function saveUsers(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Create user
function createUser(username, password, email, role = 'user') {
  const data = loadUsers();
  
  // Check if user exists
  if (data.users.find(u => u.username === username)) {
    return { success: false, error: 'Username already exists' };
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    username,
    password: hashedPassword,
    email,
    role,
    createdAt: new Date().toISOString()
  };

  data.users.push(newUser);
  saveUsers(data);

  return { success: true, user: { username, email, role } };
}

// Authenticate user
function authenticateUser(username, password) {
  const data = loadUsers();
  const user = data.users.find(u => u.username === username);

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
  const data = loadUsers();
  const userIndex = data.users.findIndex(u => u.username === username);

  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }

  const user = data.users[userIndex];
  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return { success: false, error: 'Invalid old password' };
  }

  user.password = bcrypt.hashSync(newPassword, 10);
  saveUsers(data);

  return { success: true };
}

// Get all users (admin only)
function getAllUsers() {
  const data = loadUsers();
  return data.users.map(u => ({
    username: u.username,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt
  }));
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

