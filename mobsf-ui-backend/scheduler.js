/**
 * Scheduled Scans System
 * Handles automated/scheduled APK scans
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const SCHEDULED_SCANS_FILE = path.join(__dirname, 'scheduled-scans.json');
const activeJobs = new Map();

// Initialize scheduled scans file
function initScheduledScans() {
  if (!fs.existsSync(SCHEDULED_SCANS_FILE)) {
    const initialData = {
      scans: [],
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(SCHEDULED_SCANS_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

// Load scheduled scans
function loadScheduledScans() {
  initScheduledScans();
  try {
    const data = fs.readFileSync(SCHEDULED_SCANS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading scheduled scans:', err);
    initScheduledScans();
    return loadScheduledScans();
  }
}

// Save scheduled scans
function saveScheduledScans(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(SCHEDULED_SCANS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Add scheduled scan
function addScheduledScan(scanConfig) {
  const data = loadScheduledScans();
  const newScan = {
    id: Date.now().toString(),
    name: scanConfig.name,
    cronExpression: scanConfig.cronExpression,
    apkUrl: scanConfig.apkUrl,
    apkPath: scanConfig.apkPath,
    enabled: scanConfig.enabled !== false,
    lastRun: null,
    nextRun: null,
    runCount: 0,
    createdAt: new Date().toISOString()
  };

  data.scans.push(newScan);
  saveScheduledScans(data);

  if (newScan.enabled) {
    scheduleScan(newScan);
  }

  return newScan;
}

// Remove scheduled scan
function removeScheduledScan(scanId) {
  const data = loadScheduledScans();
  const scan = data.scans.find(s => s.id === scanId);
  if (scan) {
    // Stop the cron job
    const job = activeJobs.get(scanId);
    if (job) {
      job.stop();
      activeJobs.delete(scanId);
    }
  }

  data.scans = data.scans.filter(s => s.id !== scanId);
  saveScheduledScans(data);
  return true;
}

// Update scheduled scan
function updateScheduledScan(scanId, updates) {
  const data = loadScheduledScans();
  const scanIndex = data.scans.findIndex(s => s.id === scanId);
  if (scanIndex === -1) {
    return null;
  }

  // Stop existing job
  const job = activeJobs.get(scanId);
  if (job) {
    job.stop();
    activeJobs.delete(scanId);
  }

  // Update scan
  data.scans[scanIndex] = { ...data.scans[scanIndex], ...updates };
  saveScheduledScans(data);

  // Restart if enabled
  if (data.scans[scanIndex].enabled) {
    scheduleScan(data.scans[scanIndex]);
  }

  return data.scans[scanIndex];
}

// Schedule a scan
function scheduleScan(scan) {
  if (!cron.validate(scan.cronExpression)) {
    console.error(`Invalid cron expression: ${scan.cronExpression}`);
    return null;
  }

  const job = cron.schedule(scan.cronExpression, async () => {
    console.log(`Running scheduled scan: ${scan.name} (${scan.id})`);
    
    try {
      // Update last run
      const data = loadScheduledScans();
      const scanIndex = data.scans.findIndex(s => s.id === scan.id);
      if (scanIndex !== -1) {
        data.scans[scanIndex].lastRun = new Date().toISOString();
        data.scans[scanIndex].runCount = (data.scans[scanIndex].runCount || 0) + 1;
        saveScheduledScans(data);
      }

      // Execute scan
      await executeScheduledScan(scan);
    } catch (error) {
      console.error(`Error executing scheduled scan ${scan.id}:`, error);
    }
  }, {
    scheduled: true,
    timezone: "America/New_York"
  });

  activeJobs.set(scan.id, job);

  // Calculate next run
  const data = loadScheduledScans();
  const scanIndex = data.scans.findIndex(s => s.id === scan.id);
  if (scanIndex !== -1) {
    // Simple next run calculation (can be improved)
    data.scans[scanIndex].nextRun = new Date(Date.now() + 60000).toISOString(); // Approximate
    saveScheduledScans(data);
  }

  return job;
}

// Execute a scheduled scan
async function executeScheduledScan(scan) {
  try {
    // This would integrate with your upload/scan system
    // For now, it's a placeholder that can be extended
    console.log(`Executing scan for: ${scan.name}`);
    
    // Example: If APK URL is provided, download and scan
    if (scan.apkUrl) {
      // Download APK and trigger scan
      // This would need to be integrated with your upload endpoint
    } else if (scan.apkPath) {
      // Use local APK path
      // This would need to be integrated with your upload endpoint
    }

    return { success: true, scanId: scan.id };
  } catch (error) {
    console.error(`Error executing scan ${scan.id}:`, error);
    return { success: false, error: error.message };
  }
}

// Initialize all scheduled scans on startup
function initializeScheduledScans() {
  const data = loadScheduledScans();
  data.scans.forEach(scan => {
    if (scan.enabled) {
      scheduleScan(scan);
    }
  });
  console.log(`Initialized ${data.scans.filter(s => s.enabled).length} scheduled scans`);
}

// Get all scheduled scans
function getAllScheduledScans() {
  return loadScheduledScans();
}

module.exports = {
  addScheduledScan,
  removeScheduledScan,
  updateScheduledScan,
  getAllScheduledScans,
  initializeScheduledScans
};

