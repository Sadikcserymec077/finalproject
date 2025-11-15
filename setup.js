#!/usr/bin/env node

/**
 * Automated Setup Script
 * Helps developers set up the project quickly
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const os = require('os');
const readline = require('readline');

const isWindows = os.platform() === 'win32';
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('========================================');
console.log('Static Analysis Framework - Setup');
console.log('========================================');
console.log('');

// Question helper
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Check if command exists
function commandExists(command) {
  return new Promise((resolve) => {
    exec(`${isWindows ? 'where' : 'which'} ${command}`, (error) => {
      resolve(!error);
    });
  });
}

// Check prerequisites
async function checkPrerequisites() {
  console.log('[1/5] Checking prerequisites...\n');
  
  const checks = {
    'Node.js': await commandExists('node'),
    'npm': await commandExists('npm'),
    'Docker': await commandExists('docker'),
    'Git': await commandExists('git')
  };
  
  let allGood = true;
  for (const [tool, exists] of Object.entries(checks)) {
    if (exists) {
      const version = await new Promise((resolve) => {
        exec(`${tool === 'Node.js' ? 'node' : tool.toLowerCase()} --version`, (error, stdout) => {
          resolve(error ? 'unknown' : stdout.trim());
        });
      });
      console.log(`  ✅ ${tool}: ${version}`);
    } else {
      console.log(`  ❌ ${tool}: Not installed`);
      allGood = false;
    }
  }
  
  console.log('');
  return allGood;
}

// Create .env file
async function setupEnvFile() {
  console.log('[2/5] Setting up environment file...\n');
  
  const envPath = path.join(__dirname, 'mobsf-ui-backend', '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  if (fs.existsSync(envPath)) {
    console.log('  ⚠️  .env file already exists');
    const overwrite = await question('  Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('  ℹ️  Skipping .env setup\n');
      return;
    }
  }
  
  // Read example if exists, otherwise use defaults
  let envContent = '';
  if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8');
  } else {
    envContent = `MOBSF_URL=http://localhost:8000
MOBSF_API_KEY=your-api-key-here
PORT=4000

# Optional: SonarQube configuration
SONAR_HOST=
SONAR_TOKEN=
`;
  }
  
  // Ask for API key
  console.log('  📝 MobSF API Key Setup:');
  console.log('    1. Start MobSF: cd mobsf-ui-backend && docker-compose up -d');
  console.log('    2. Open http://localhost:8000');
  console.log('    3. Go to Settings → API Key');
  console.log('    4. Copy the API key\n');
  
  const apiKey = await question('  Enter MobSF API key (or press Enter to set later): ');
  
  if (apiKey.trim()) {
    envContent = envContent.replace('your-api-key-here', apiKey.trim());
  }
  
  // Ensure directory exists
  const envDir = path.dirname(envPath);
  if (!fs.existsSync(envDir)) {
    fs.mkdirSync(envDir, { recursive: true });
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('  ✅ .env file created at mobsf-ui-backend/.env\n');
  
  if (!apiKey.trim()) {
    console.log('  ⚠️  Remember to update MOBSF_API_KEY in mobsf-ui-backend/.env\n');
  }
}

// Install dependencies
async function installDependencies() {
  console.log('[3/5] Installing dependencies...\n');
  
  const install = async (dir, name) => {
    return new Promise((resolve) => {
      if (!fs.existsSync(dir)) {
        console.log(`  ⚠️  ${name} directory not found, skipping...\n`);
        resolve();
        return;
      }
      
      console.log(`  📦 Installing ${name} dependencies...`);
      const npm = spawn('npm', ['install'], {
        cwd: dir,
        stdio: 'inherit',
        shell: true
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          console.log(`  ✅ ${name} dependencies installed\n`);
        } else {
          console.log(`  ⚠️  ${name} installation had issues (code ${code})\n`);
        }
        resolve();
      });
    });
  };
  
  // Install root dependencies
  await install(__dirname, 'Root');
  
  // Install backend dependencies
  await install(path.join(__dirname, 'mobsf-ui-backend'), 'Backend');
  
  // Install frontend dependencies
  await install(path.join(__dirname, 'mobsf-frontend'), 'Frontend');
}

// Verify Docker
async function verifyDocker() {
  console.log('[4/5] Verifying Docker...\n');
  
  return new Promise((resolve) => {
    exec('docker ps', (error) => {
      if (error) {
        console.log('  ⚠️  Docker is not running');
        console.log('     Please start Docker Desktop and run this script again\n');
        resolve(false);
      } else {
        console.log('  ✅ Docker is running\n');
        resolve(true);
      }
    });
  });
}

// Final instructions
function showFinalInstructions() {
  console.log('[5/5] Setup complete!\n');
  console.log('========================================');
  console.log('Next Steps:');
  console.log('========================================\n');
  console.log('1. Make sure Docker Desktop is running');
  console.log('2. Update MOBSF_API_KEY in mobsf-ui-backend/.env');
  console.log('3. Start all services:\n');
  
  if (isWindows) {
    console.log('   start.bat');
  } else {
    console.log('   bash start.sh');
  }
  
  console.log('\n   Or use: npm start\n');
  console.log('4. Open http://localhost:3000 in your browser\n');
  console.log('========================================\n');
}

// Main execution
async function main() {
  try {
    const prerequisitesOk = await checkPrerequisites();
    
    if (!prerequisitesOk) {
      console.log('❌ Some prerequisites are missing.');
      console.log('   Please install the missing tools and run setup again.\n');
      rl.close();
      process.exit(1);
      return;
    }
    
    await setupEnvFile();
    await installDependencies();
    await verifyDocker();
    showFinalInstructions();
    
    rl.close();
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Run setup
main();

