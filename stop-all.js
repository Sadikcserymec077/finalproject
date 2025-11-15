#!/usr/bin/env node

/**
 * Stop All Services - Cross-platform shutdown script
 * Gracefully stops MobSF, Backend, and Frontend services
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';

console.log('========================================');
console.log('Stopping All Services...');
console.log('========================================');
console.log('');

// Stop MobSF Docker
function stopMobSF() {
  return new Promise((resolve) => {
    console.log('[1/2] Stopping MobSF (Docker)...');
    
    const dockerComposePath = path.join(__dirname, 'mobsf-ui-backend');
    const command = isWindows ? 'docker-compose' : 'docker-compose';
    
    const stop = spawn(command, ['down'], {
      cwd: dockerComposePath,
      stdio: 'inherit',
      shell: true
    });
    
    stop.on('close', (code) => {
      if (code === 0) {
        console.log('[OK] MobSF stopped');
      } else {
        console.log('[INFO] MobSF may not have been running');
      }
      resolve();
    });
  });
}

// Find and kill Node processes
function stopNodeProcesses() {
  return new Promise((resolve) => {
    console.log('[2/2] Stopping Node.js processes...');
    
    if (isWindows) {
      // Windows: Find and kill Node processes
      exec('tasklist /FI "IMAGENAME eq node.exe"', (error, stdout) => {
        if (stdout.includes('node.exe')) {
          console.log('[INFO] Stopping Node.js processes...');
          exec('taskkill /F /IM node.exe', (error) => {
            if (error) {
              console.log('[INFO] No Node.js processes found or already stopped');
            } else {
              console.log('[OK] Node.js processes stopped');
            }
            resolve();
          });
        } else {
          console.log('[OK] No Node.js processes running');
          resolve();
        }
      });
    } else {
      // Unix/Mac: Find and kill Node processes on ports 3000 and 4000
      const ports = [3000, 4000];
      let completed = 0;
      
      ports.forEach((port) => {
        exec(`lsof -ti:${port}`, (error, stdout) => {
          if (stdout.trim()) {
            const pid = stdout.trim();
            exec(`kill -9 ${pid}`, (error) => {
              if (!error) {
                console.log(`[OK] Stopped process on port ${port}`);
              }
              completed++;
              if (completed === ports.length) {
                resolve();
              }
            });
          } else {
            console.log(`[OK] No process on port ${port}`);
            completed++;
            if (completed === ports.length) {
              resolve();
            }
          }
        });
      });
    }
  });
}

// Main execution
async function main() {
  try {
    await stopMobSF();
    await stopNodeProcesses();
    
    console.log('');
    console.log('========================================');
    console.log('All Services Stopped!');
    console.log('========================================');
    console.log('');
    console.log('All services have been stopped:');
    console.log('  ✓ MobSF (Docker)');
    console.log('  ✓ Backend Server');
    console.log('  ✓ Frontend Server');
    console.log('');
    
  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n[INFO] Interrupted by user');
  process.exit(0);
});

main();

