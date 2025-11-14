# 🛡️ Static Analysis Framework v2.0

> A modern, responsive web-based UI for MobSF (Mobile Security Framework) with multi-tool analysis capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-19.2.0-blue)](https://reactjs.org/)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#️-configuration)
- [Usage](#-usage)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)

---

## ✨ Features

### Core Features
- 📱 **APK Analysis** - Upload and analyze Android APK files
- 🔍 **Multi-Tool Analysis** - MobSF + SonarQube integration
- 📊 **Unified Reports** - Merged findings from all tools with visualizations
- 📄 **Raw JSON Export** - Download individual or combined reports
- 🎨 **Modern UI** - Gradient design with smooth animations
- 📱 **Fully Responsive** - Works on mobile, tablet, and desktop
- 🚀 **Auto-Run Tools** - Automatically run all tools after upload
- 💾 **PDF Export** - Download MobSF PDF reports

### Analysis Tools
1. **MobSF** - Real-time mobile security analysis
2. **SonarQube** - Code quality and security analysis (configurable)

### Report Views
- **MobSF Summary** - Human-readable security findings
- **Unified Report** - Combined analysis with charts and statistics
- **Raw JSON** - Separate views for MobSF, SonarQube, and combined data
- **Recent Scans** - Historical analysis results

---

## 🛠️ Tech Stack

### Frontend
- **React** 19.2.0 - UI framework
- **React Bootstrap** 2.10.6 - UI components
- **Recharts** 2.15.0 - Data visualization
- **Axios** 1.7.9 - HTTP client

### Backend
- **Node.js** 18+ - Runtime environment
- **Express** 4.18.3 - Web framework
- **Axios** - API communication with MobSF
- **Multer** - File upload handling

### External Services
- **MobSF** - Mobile Security Framework (Docker)
- **SonarQube** - Optional code analysis (Docker or cloud)

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Docker Desktop** - [Download](https://www.docker.com/) (for MobSF)
- **Git** - [Download](https://git-scm.com/)

### System Requirements
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 2GB free space
- **OS**: Windows 10/11, macOS 10.15+, or Linux

---

## 🚀 Quick Start

### Windows Users - Automated Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/static-analysis-mobsf.git
cd static-analysis-mobsf

# Run automated setup script
setup.bat
```

The script will:
1. ✅ Check for Node.js and Docker
2. ✅ Install all dependencies
3. ✅ Create `.env` file
4. ✅ Guide you through next steps

### macOS/Linux Users - Manual Setup

See [Installation](#-installation) section below.

---

## 💻 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/static-analysis-mobsf.git
cd static-analysis-mobsf
```

### Step 2: Start MobSF (Docker)

```bash
# Pull MobSF Docker image
docker pull opensecurity/mobile-security-framework-mobsf:latest

# Run MobSF container
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest
```

**Get your API key:**
1. Open http://localhost:8000 in your browser
2. Login with default credentials: `mobsf` / `mobsf`
3. Navigate to **API Docs** section
4. Copy your **API Key**

### Step 3: Setup Backend

```bash
# Navigate to backend directory
cd mobsf-ui-backend

# Install dependencies
npm install

# Create .env file
touch .env  # or use your text editor
```

**Add the following to `.env`:**

```env
MOBSF_URL=http://localhost:8000
MOBSF_API_KEY=your-api-key-here
PORT=4000

# Optional: SonarQube configuration (leave empty for simulated mode)
SONAR_HOST=
SONAR_TOKEN=
```

**Start the backend:**

```bash
npm run dev
```

✅ Backend should now be running on http://localhost:4000

### Step 4: Setup Frontend

Open a **new terminal** window:

```bash
# Navigate to frontend directory
cd mobsf-frontend

# Install dependencies
npm install

# Start development server
npm start
```

✅ Frontend will automatically open at http://localhost:3000

---

## ⚙️ Configuration

### Backend Configuration (`.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MOBSF_URL` | MobSF server URL | ✅ Yes | http://localhost:8000 |
| `MOBSF_API_KEY` | MobSF API key from dashboard | ✅ Yes | - |
| `PORT` | Backend server port | ❌ No | 4000 |
| `SONAR_HOST` | SonarQube server URL | ❌ No | - |
| `SONAR_TOKEN` | SonarQube authentication token | ❌ No | - |

### Frontend Configuration

The frontend automatically connects to `http://localhost:4000`. To change this:

1. Edit `mobsf-frontend/src/api.js`
2. Update `API_BASE` constant:

```javascript
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';
```

### SonarQube Setup (Optional)

To use **real SonarQube** instead of simulated mode:

1. **Install SonarQube:**
   ```bash
   docker pull sonarqube:latest
   docker run -d -p 9000:9000 sonarqube:latest
   ```

2. **Get authentication token:**
   - Open http://localhost:9000
   - Login (default: admin/admin)
   - Go to Account → Security → Generate Token

3. **Update `.env`:**
   ```env
   SONAR_HOST=http://localhost:9000
   SONAR_TOKEN=your-token-here
   ```

4. **Restart backend:**
   ```bash
   npm run dev
   ```

---

## 📖 Usage

### 1. Upload APK File

1. Navigate to **Dashboard** (default view)
2. Click **"Choose File"** or drag & drop APK
3. Select analysis mode:
   - **Run All Tools** (default) - Automatically runs MobSF + SonarQube
   - **Select Specific Tools** - Choose individual tools
4. Click **"Upload & Analyze"**

### 2. View Analysis Progress

The upload card shows real-time status:
- ⬆️ **Uploading** - File upload in progress
- 🔍 **Scanning** - MobSF analysis running
- ⏳ **Running Tools** - Additional tools executing
- ✅ **Ready** - Analysis complete

### 3. Explore Reports

#### MobSF Summary
- Click **"MobSF Summary"** button
- View human-readable findings
- See security issues categorized by severity
- Review permissions and app metadata

#### Unified Report
- Click **"Unified Report"** button
- View combined analysis from all tools
- Interactive charts and visualizations
- Security score and recommendations

#### Raw JSON
- Click **"Raw JSON"** button
- Access 3 tabs:
  - 🔴 **MobSF** - Raw MobSF JSON output
  - 🟣 **SonarQube** - Raw SonarQube JSON output
  - 📊 **Combined** - Merged data from all tools
- Download individual JSON files

#### PDF Export
- Click **"PDF"** button
- Download MobSF PDF report
- View inline or save to disk

### 4. Navigation

- **Dashboard** - Upload & analyze APKs
- **Reports** - View all saved reports
- **Settings** - Configuration and tool info

### 5. Recent Scans

The **Recent Scans** card shows:
- Previously analyzed APKs
- App name, package, and scan date
- Click any scan to view its report

---

## 🌐 Deployment

### Deploy to Vercel (Frontend)

```bash
cd mobsf-frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts and set environment variable:
# REACT_APP_API_BASE = https://your-backend-url.com
```

### Deploy to Heroku (Full Stack)

#### Backend

```bash
cd mobsf-ui-backend

# Login to Heroku
heroku login

# Create app
heroku create your-app-backend

# Set environment variables
heroku config:set MOBSF_URL=http://your-mobsf-server
heroku config:set MOBSF_API_KEY=your-api-key
heroku config:set PORT=4000

# Deploy
git init
git add .
git commit -m "Deploy backend"
heroku git:remote -a your-app-backend
git push heroku main
```

#### Frontend

```bash
cd mobsf-frontend

# Create app
heroku create your-app-frontend

# Set environment variable
heroku config:set REACT_APP_API_BASE=https://your-app-backend.herokuapp.com

# Add buildpack
heroku buildpacks:set https://github.com/mars/create-react-app-buildpack

# Deploy
git init
git add .
git commit -m "Deploy frontend"
heroku git:remote -a your-app-frontend
git push heroku main
```

### Deploy to VPS (DigitalOcean/AWS/Azure)

For complete VPS deployment instructions with Nginx and PM2, see:
- **DEPLOYMENT_GUIDE.md** - Comprehensive deployment guide

### Docker Compose (All-in-One)

Create `docker-compose.yml` in the project root:

```yaml
version: '3.8'
services:
  mobsf:
    image: opensecurity/mobile-security-framework-mobsf:latest
    ports:
      - "8000:8000"
    environment:
      - MOBSF_API_KEY=your-api-key

  backend:
    build: ./mobsf-ui-backend
    ports:
      - "4000:4000"
    environment:
      - MOBSF_URL=http://mobsf:8000
      - MOBSF_API_KEY=your-api-key
      - PORT=4000
    depends_on:
      - mobsf

  frontend:
    build: ./mobsf-frontend
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_BASE=http://localhost:4000
    depends_on:
      - backend
```

**Deploy:**

```bash
docker-compose up -d
```

**Access:** http://localhost:3000

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Cannot connect to MobSF"

**Solution:**
```bash
# Check if MobSF is running
docker ps | grep mobsf

# If not running, start it:
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest

# Verify .env has correct MOBSF_URL
cat mobsf-ui-backend/.env
```

#### 2. "API key invalid"

**Solution:**
1. Go to http://localhost:8000
2. Login → API Docs
3. Copy new API key
4. Update `mobsf-ui-backend/.env`:
   ```env
   MOBSF_API_KEY=your-new-key
   ```
5. Restart backend: `npm run dev`

#### 3. "Port already in use"

**Solution:**
```bash
# Kill processes on ports 3000 and 4000
npx kill-port 3000
npx kill-port 4000

# Or use different ports
PORT=3001 npm start  # Frontend
PORT=4001 npm run dev  # Backend
```

#### 4. "Module not found" errors

**Solution:**
```bash
# Clear and reinstall dependencies
cd mobsf-ui-backend
rm -rf node_modules package-lock.json
npm install

cd ../mobsf-frontend
rm -rf node_modules package-lock.json
npm install
```

#### 5. "Network Error" on upload

**Solution:**
```bash
# Check backend is running
curl http://localhost:4000/api/health

# Check CORS in server.js
# Ensure: app.use(cors());

# Restart backend
cd mobsf-ui-backend
npm run dev
```

#### 6. "SonarQube analysis failed"

**Expected behavior:** SonarQube runs in **simulated mode** by default.

**To use real SonarQube:**
1. Install SonarQube (see Configuration section)
2. Add credentials to `.env`
3. Restart backend

#### 7. Mobile view issues

**Solution:**
```bash
# Clear browser cache
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)

# The app is fully responsive - test in different browsers
```

### Getting Help

For more troubleshooting:
- **DEPLOYMENT_GUIDE.md** - 10+ error solutions
- **QUICK_START.md** - Fast setup guide
- **GitHub Issues** - Report bugs or ask questions

### Enable Debug Logging

**Backend logs:**
```bash
cd mobsf-ui-backend
DEBUG=* npm run dev
```

**Frontend logs:**
- Open browser console (F12 → Console tab)
- Check Network tab for failed requests

---

## 📁 Project Structure

```
static-analysis-mobsf/
├── mobsf-ui-backend/          # Backend Express server
│   ├── server.js              # Main server file
│   ├── package.json           # Backend dependencies
│   ├── .env                   # Environment variables (create this)
│   ├── tmp/                   # Temporary upload storage
│   └── reports/               # Saved JSON/PDF reports
│       ├── json/              # JSON reports
│       └── pdf/               # PDF reports
│
├── mobsf-frontend/            # Frontend React app
│   ├── public/                # Static files
│   │   └── index.html         # HTML template
│   ├── src/                   # Source code
│   │   ├── components/        # React components
│   │   │   ├── NavBar.js      # Navigation bar
│   │   │   ├── UploadCard.js  # APK upload interface
│   │   │   ├── ScansCard.js   # Recent scans list
│   │   │   ├── ReportPanel.js # Report display
│   │   │   ├── HumanReport.js # MobSF summary view
│   │   │   ├── DetailedReport.js # Unified report view
│   │   │   └── LogsModal.js   # Scan logs modal
│   │   ├── api.js             # API client
│   │   ├── App.js             # Main App component
│   │   ├── App.css            # App styles
│   │   ├── index.js           # React entry point
│   │   └── index.css          # Global styles
│   └── package.json           # Frontend dependencies
│
├── test-folder/               # Test scripts (optional)
│
├── setup.bat                  # Windows automated setup
├── README.md                  # This file
├── DEPLOYMENT_GUIDE.md        # Comprehensive deployment guide
├── QUICK_START.md             # Quick setup reference
└── CHANGES_SUMMARY.md         # Version changelog
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly:**
   ```bash
   npm test  # Run tests
   npm run build  # Verify build
   ```
5. **Commit your changes:**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to your fork:**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Update documentation for new features
- Test on multiple browsers/devices
- Ensure responsive design works

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🙏 Acknowledgments

- **MobSF Team** - [Mobile Security Framework](https://github.com/MobSF/Mobile-Security-Framework-MobSF)
- **SonarQube** - [Code Quality and Security](https://www.sonarqube.org/)
- **React Bootstrap** - UI components
- **Recharts** - Chart library

---

## 🔄 Changelog

### v2.0.0 (Current)
- ✅ Removed Android Lint integration
- ✅ Updated to "Static Analysis Framework"
- ✅ Added functional navigation (Dashboard, Reports, Settings)
- ✅ Integrated Recent Scans into main interface
- ✅ Added unified report with MobSF + SonarQube
- ✅ Implemented separate tool JSON views
- ✅ Made fully responsive for mobile devices
- ✅ Removed "Open MobSF" link
- ✅ Enhanced UI with modern gradients
- ✅ Added comprehensive deployment guides
- ✅ Created automated setup scripts

### v1.0.0
- Initial release with MobSF, Android Lint, and SonarQube
- Basic upload and report viewing
- Human-readable report generation

---

## 🚀 Quick Links

- [Installation](#-installation)
- [Configuration](#️-configuration)
- [Usage](#-usage)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

**Made with ❤️ for Mobile Security Analysis**

⭐ **Star this repo** if you find it helpful!
