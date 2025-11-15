#!/usr/bin/env node

/**
 * Start All Services - Cross-platform startup script
 * Starts MobSF (Docker), Backend, and Frontend in one command
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';

console.log('========================================');
console.log('Static Analysis Framework - Quick Start');
console.log('========================================');
console.log('');

// Check prerequisites
function checkPrerequisites() {
  return new Promise((resolve, reject) => {
    console.log('[CHECK] Checking prerequisites...');
    
    // Check Node.js
    exec('node --version', (error) => {
      if (error) {
        console.error('[ERROR] Node.js is not installed!');
        console.error('Please install Node.js from https://nodejs.org/');
        reject(error);
        return;
      }
      
      // Check Docker
      exec('docker ps', (error) => {
        if (error) {
          console.error('[WARNING] Docker is not running!');
          console.error('Please start Docker Desktop first.');
          reject(error);
          return;
        }
        
        console.log('[OK] Prerequisites checked');
        resolve();
      });
    });
  });
}

// Check .env file
function checkEnvFile() {
  const envPath = path.join(__dirname, 'mobsf-ui-backend', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('[WARNING] .env file not found!');
    console.log('Creating default .env file...');
    
    const envContent = `MOBSF_URL=http://localhost:8000
MOBSF_API_KEY=your-api-key-here
PORT=4000
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('[INFO] Please update MOBSF_API_KEY in mobsf-ui-backend/.env');
    console.log('');
  }
}

// Start MobSF Docker
function startMobSF() {
  return new Promise((resolve) => {
    console.log('[1/3] Starting MobSF (Docker)...');
    
    const dockerComposePath = path.join(__dirname, 'mobsf-ui-backend');
    const command = isWindows ? 'docker-compose' : 'docker-compose';
    
    const mobsf = spawn(command, ['up', '-d'], {
      cwd: dockerComposePath,
      stdio: 'inherit',
      shell: true
    });
    
    mobsf.on('close', (code) => {
      if (code === 0) {
        console.log('[OK] MobSF started');
        setTimeout(resolve, 5000); // Wait 5 seconds for MobSF to initialize
      } else {
        console.error('[ERROR] Failed to start MobSF');
        resolve(); // Continue anyway
      }
    });
  });
}

// Start Backend
function startBackend() {
  return new Promise((resolve) => {
    console.log('[2/3] Starting Backend Server...');
    
    const backendPath = path.join(__dirname, 'mobsf-ui-backend');
    const backend = spawn('npm', ['run', 'dev'], {
      cwd: backendPath,
      stdio: 'inherit',
      shell: true
    });
    
    // Give backend time to start
    setTimeout(() => {
      console.log('[OK] Backend starting on http://localhost:4000');
      resolve();
    }, 3000);
  });
}

// Start Frontend
function startFrontend() {
  console.log('[3/3] Starting Frontend Server...');
  
  const frontendPath = path.join(__dirname, 'mobsf-frontend');
  
  // Set BROWSER=none to prevent React from auto-opening browser
  const env = { ...process.env, BROWSER: 'none' };
  
  const frontend = spawn('npm', ['start'], {
    cwd: frontendPath,
    stdio: 'inherit',
    shell: true,
    env: env
  });
  
  console.log('[OK] Frontend starting on http://localhost:3000');
  
  // Open browser only once after delay
  let browserOpened = false;
  const openBrowser = () => {
    if (browserOpened) return;
    browserOpened = true;
    
    const url = 'http://localhost:3000';
    const command = isWindows 
      ? `start ${url}`
      : (os.platform() === 'darwin' ? `open ${url}` : `xdg-open ${url}`);
    
    exec(command, (error) => {
      if (error) {
        console.log(`\n[INFO] Please open ${url} in your browser`);
      } else {
        console.log(`[INFO] Browser opened at ${url}`);
      }
    });
  };
  
  // Open browser after delay
  setTimeout(openBrowser, 12000);
  
  return frontend;
}

// Main execution
async function main() {
  try {
    await checkPrerequisites();
    checkEnvFile();
    
    console.log('');
    console.log('========================================');
    console.log('Starting All Services...');
    console.log('========================================');
    console.log('');
    
    await startMobSF();
    await startBackend();
    startFrontend();
    
    console.log('');
    console.log('========================================');
    console.log('All Services Started!');
    console.log('========================================');
    console.log('');
    console.log('Services running:');
    console.log('  - MobSF:        http://localhost:8000');
    console.log('  - Backend API:  http://localhost:4000');
    console.log('  - Frontend:     http://localhost:3000');
    console.log('');
    console.log('Press Ctrl+C to stop all services');
    console.log('');
    
  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n[INFO] Stopping services...');
  exec('cd mobsf-ui-backend && docker-compose down', () => {
    console.log('[OK] Services stopped');
    process.exit(0);
  });
});

main();

