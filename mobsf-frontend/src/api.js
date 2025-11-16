// src/api.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

// Set up axios interceptor for auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// File upload
export const uploadFile = (file, onUploadProgress) => {
  const fd = new FormData();
  fd.append('file', file);
  return axios.post(`${API_BASE}/api/upload`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
};

// Trigger scan
export const triggerScan = (hash, re_scan = 0) =>
  axios.post(`${API_BASE}/api/scan`, { hash, re_scan });

// Get raw JSON report (proxy)
export const getReportJSON = (hash) =>
  axios.get(`${API_BASE}/api/report_json`, { params: { hash } });

// Get "crucial" summarized findings
export const getCrucial = (hash) =>
  axios.get(`${API_BASE}/api/report_json/crucial`, { params: { hash } });

// List recent scans (proxy)
export const getScans = (page = 1, page_size = 10) =>
  axios.get(`${API_BASE}/api/scans`, { params: { page, page_size } });

// Poll scan logs (backend proxies to MobSF)
export const getScanLogs = (hash) =>
  axios.post(`${API_BASE}/api/scan_logs`, `hash=${hash}`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

// Save & cache JSON report on server, returns saved path + data
export const saveJsonReport = (hash) =>
  axios.get(`${API_BASE}/api/report_json/save`, { params: { hash } });

// Save & download PDF (returns blob)
export const savePdfReport = (hash) =>
  axios.get(`${API_BASE}/api/download_pdf/save`, { 
    params: { hash }, 
    responseType: 'blob',
    validateStatus: function (status) {
      // Accept both success (200) and error statuses to handle them properly
      return status >= 200 && status < 500;
    }
  }).then(response => {
    // Check if response is actually an error (JSON error message)
    if (response.status >= 400) {
      // When responseType is 'blob', error responses are also blobs
      // Convert blob to text to parse JSON error message
      return response.data.text().then(text => {
        try {
          const errorData = JSON.parse(text);
          const error = new Error(errorData.message || errorData.error || 'PDF fetch failed');
          error.response = { data: errorData, status: response.status };
          throw error;
        } catch (e) {
          // If not JSON, throw with status
          const error = new Error(text || `PDF fetch failed with status ${response.status}`);
          error.response = { data: { message: text }, status: response.status };
          throw error;
        }
      });
    }
    return response;
  }).catch(error => {
    // Handle network errors and other axios errors
    if (error.response && error.response.data && error.response.data instanceof Blob) {
      // If error response is a blob, try to parse it
      return error.response.data.text().then(text => {
        try {
          const errorData = JSON.parse(text);
          error.response.data = errorData;
        } catch (e) {
          error.response.data = { message: text || 'PDF fetch failed' };
        }
        throw error;
      });
    }
    throw error;
  });

// List saved reports
export const listSavedReports = () =>
  axios.get(`${API_BASE}/api/reports`);

// SonarQube Analysis
export const runSonarQube = (hash) =>
  axios.post(`${API_BASE}/api/sonarqube`, { hash });

// Get Unified Report (merges all tools)
export const getUnifiedReport = (hash) =>
  axios.get(`${API_BASE}/api/unified_report`, { params: { hash } });

// ============================================
// NEW FEATURES - Enhanced API Functions
// ============================================

// Search and Filter
export const searchReports = (filters) =>
  axios.get(`${API_BASE}/api/reports/search`, { params: filters });

// Report Management
export const deleteReport = (hash) =>
  axios.delete(`${API_BASE}/api/reports/${hash}`);

export const bulkDeleteReports = (hashes) =>
  axios.post(`${API_BASE}/api/reports/bulk-delete`, { hashes });

export const archiveReport = (hash) =>
  axios.post(`${API_BASE}/api/reports/${hash}/archive`);

export const unarchiveReport = (hash) =>
  axios.post(`${API_BASE}/api/reports/${hash}/unarchive`);

// Tags
export const addTag = (hash, tag) =>
  axios.post(`${API_BASE}/api/reports/${hash}/tags`, { tag });

export const removeTag = (hash, tag) =>
  axios.delete(`${API_BASE}/api/reports/${hash}/tags/${tag}`);

export const getAllTags = () =>
  axios.get(`${API_BASE}/api/tags`);

// Favorites
export const toggleFavorite = (hash) =>
  axios.post(`${API_BASE}/api/reports/${hash}/favorite`);

// Annotations
export const addAnnotation = (hash, annotation) =>
  axios.post(`${API_BASE}/api/reports/${hash}/annotations`, annotation);

export const deleteAnnotation = (hash, annotationId) =>
  axios.delete(`${API_BASE}/api/reports/${hash}/annotations/${annotationId}`);

export const markFalsePositive = (hash, findingId) =>
  axios.post(`${API_BASE}/api/reports/${hash}/false-positive`, { findingId });

// Metadata
export const getReportMetadata = (hash) =>
  axios.get(`${API_BASE}/api/reports/${hash}/metadata`);

// Export
export const exportToCSV = (hash) =>
  axios.get(`${API_BASE}/api/reports/${hash}/export/csv`, { responseType: 'blob' });

// Comparison
export const compareReports = (hash1, hash2) =>
  axios.get(`${API_BASE}/api/reports/compare`, { params: { hash1, hash2 } });

// Analytics
export const getAnalyticsDashboard = () =>
  axios.get(`${API_BASE}/api/analytics/dashboard`);

// ============================================
// NOTIFICATIONS
// ============================================
export const getNotificationsConfig = () =>
  axios.get(`${API_BASE}/api/notifications/config`);

export const updateNotificationsConfig = (config) =>
  axios.post(`${API_BASE}/api/notifications/config`, config);

export const testEmailConfig = () =>
  axios.post(`${API_BASE}/api/notifications/test-email`);

export const sendNotification = (subject, html, text) =>
  axios.post(`${API_BASE}/api/notifications/send`, { subject, html, text });

// ============================================
// AUTHENTICATION
// ============================================
export const register = (username, password, email, role) =>
  axios.post(`${API_BASE}/api/auth/register`, { username, password, email, role });

export const login = (username, password) =>
  axios.post(`${API_BASE}/api/auth/login`, { username, password });

export const verifyToken = () =>
  axios.get(`${API_BASE}/api/auth/verify`);

export const changePassword = (oldPassword, newPassword) =>
  axios.post(`${API_BASE}/api/auth/change-password`, { oldPassword, newPassword });

export const getAllUsers = () =>
  axios.get(`${API_BASE}/api/auth/users`);

// ============================================
// SEND REPORT VIA EMAIL
// ============================================
export const sendReportEmail = (hash) =>
  axios.post(`${API_BASE}/api/notifications/send-report`, { hash });

// ============================================
// SHAREABLE LINKS
// ============================================
export const generateShareableLink = (hash, options) =>
  axios.post(`${API_BASE}/api/reports/${hash}/share`, options);

export const accessShareableLink = (token, password) =>
  axios.get(`${API_BASE}/api/shared/${token}`, { params: { password } });

export const getLinkInfo = (token) =>
  axios.get(`${API_BASE}/api/shared/${token}/info`);

export const revokeShareableLink = (token) =>
  axios.delete(`${API_BASE}/api/shared/${token}`);

export const getLinksForHash = (hash) =>
  axios.get(`${API_BASE}/api/reports/${hash}/links`);

// ============================================
// CACHE
// ============================================
export const getCacheStats = () =>
  axios.get(`${API_BASE}/api/cache/stats`);

export const clearCache = (key) =>
  axios.post(`${API_BASE}/api/cache/clear`, { key });
