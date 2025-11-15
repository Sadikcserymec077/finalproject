# 🚀 One-Click Setup Guide

## Quick Start - Get Running in 60 Seconds!

This guide ensures anyone can clone and run this project with minimal effort.

---

## 📋 Prerequisites

Before starting, make sure you have:

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **Docker Desktop** - [Download](https://www.docker.com/)
3. **Git** - [Download](https://git-scm.com/)

**System Requirements:**
- RAM: 4GB minimum (8GB recommended)
- Storage: 2GB free space
- OS: Windows 10/11, macOS 10.15+, or Linux

---

## ⚡ One-Click Setup (Easiest Method)

### Windows Users

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd static-analysis-mobsf-main
   ```

2. **Double-click `START.bat`** - That's it!

   The script automatically:
   - ✅ Checks prerequisites (Node.js, Docker)
   - ✅ Installs all dependencies
   - ✅ Creates `.env` file with auto-generated API key
   - ✅ Starts MobSF (Docker)
   - ✅ Starts Backend Server (port 4000)
   - ✅ Starts Frontend Server (port 3000)
   - ✅ Opens browser automatically

### Linux/Mac Users

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd static-analysis-mobsf-main
   ```

2. **Run one command:**
   ```bash
   npm start
   ```

   Or use the shell script:
   ```bash
   bash start.sh
   ```

---

## 🛠️ Alternative Setup Methods

### Method 1: Automated Setup Script

**Windows:**
```bash
setup.bat
```

**Linux/Mac:**
```bash
node setup.js
```

This will:
- Check prerequisites
- Install all dependencies
- Create `.env` file
- Guide you through configuration

### Method 2: Manual Setup

1. **Install dependencies:**
   ```bash
   # Root level
   npm install
   
   # Backend
   cd mobsf-ui-backend
   npm install
   
   # Frontend
   cd ../mobsf-frontend
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cd ../mobsf-ui-backend
   cp ../.env.example .env
   ```

3. **Configure API Key:**
   - Start MobSF: `cd mobsf-ui-backend && docker-compose up -d`
   - Open http://localhost:8000
   - Go to Settings → API Key
   - Copy the key to `mobsf-ui-backend/.env`:
     ```
     MOBSF_API_KEY=your-copied-key-here
     ```

4. **Start services:**
   ```bash
   # From project root
   npm start
   ```

---

## 📦 What Gets Installed

### Backend Dependencies
- Express.js - Web framework
- Axios - HTTP client
- Multer - File upload handling
- Nodemailer - Email notifications
- @sendgrid/mail - SendGrid email service
- jsonwebtoken - JWT authentication
- bcryptjs - Password hashing
- node-cron - Scheduled scans
- bull - Job queue
- redis - Caching (optional)
- uuid - Unique ID generation

### Frontend Dependencies
- React 19.2.0 - UI framework
- React Bootstrap - UI components
- Recharts - Data visualization
- Axios - HTTP client
- Bootstrap Icons - Icons

---

## ⚙️ Configuration

### Environment Variables

The `.env` file in `mobsf-ui-backend/` contains:

```env
MOBSF_URL=http://localhost:8000
MOBSF_API_KEY=your-api-key-here
PORT=4000

# Optional: SonarQube
SONAR_HOST=
SONAR_TOKEN=
```

### Auto-Generated API Key

The setup scripts can auto-generate an API key. If you prefer to set it manually:

1. Start MobSF: `cd mobsf-ui-backend && docker-compose up -d`
2. Open http://localhost:8000
3. Login: `mobsf` / `mobsf`
4. Go to Settings → API Key
5. Copy the key to `.env` file

---

## 🎯 First Run Checklist

After setup, verify everything works:

1. ✅ **MobSF is running** - http://localhost:8000
2. ✅ **Backend is running** - http://localhost:4000
3. ✅ **Frontend is running** - http://localhost:3000
4. ✅ **Browser opened automatically** - http://localhost:3000

---

## 🚀 All Features Included

This setup includes all latest features:

### Core Features
- ✅ APK Analysis with MobSF
- ✅ Multi-tool analysis (MobSF + SonarQube)
- ✅ Unified reports with visualizations
- ✅ PDF and JSON export
- ✅ Report comparison
- ✅ Search and filter reports

### Advanced Features
- ✅ Email notifications (SMTP/SendGrid)
- ✅ Multi-user authentication
- ✅ Report annotations and tags
- ✅ Analytics dashboard
- ✅ Report archiving and favorites
- ✅ CSV export
- ✅ Report caching for performance

### User Experience
- ✅ Dark/Light mode toggle
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Modern UI with gradients
- ✅ Real-time scan progress
- ✅ Security score calculation

---

## 🐛 Troubleshooting

### "Node.js not found"
- Install Node.js from https://nodejs.org/
- Restart terminal/command prompt after installation

### "Docker is not running"
- Start Docker Desktop
- Wait for it to fully start (whale icon in system tray)
- Run setup again

### "Port already in use"
```bash
# Windows
npx kill-port 3000
npx kill-port 4000
npx kill-port 8000

# Linux/Mac
lsof -ti:3000 | xargs kill
lsof -ti:4000 | xargs kill
lsof -ti:8000 | xargs kill
```

### "API key invalid"
1. Check MobSF is running: http://localhost:8000
2. Get API key from MobSF Settings
3. Update `mobsf-ui-backend/.env`:
   ```
   MOBSF_API_KEY=your-new-key
   ```
4. Restart backend

### "Module not found"
```bash
# Clean install
cd mobsf-ui-backend
rm -rf node_modules package-lock.json
npm install

cd ../mobsf-frontend
rm -rf node_modules package-lock.json
npm install
```

### "Cannot connect to MobSF"
1. Check Docker is running: `docker ps`
2. Check MobSF container: `docker ps | grep mobsf`
3. If not running: `cd mobsf-ui-backend && docker-compose up -d`
4. Wait 10-15 seconds for MobSF to initialize

---

## 📚 Additional Resources

- **README.md** - Full documentation
- **QUICK_START.md** - Quick reference
- **FEATURES_COMPLETED.md** - Feature list
- **FEATURES_TESTING_GUIDE.md** - Testing guide
- **EMAIL_SETUP_GUIDE.md** - Email configuration

---

## 🎉 Success!

If you see the frontend at http://localhost:3000, you're all set!

**Next Steps:**
1. Upload an APK file to test
2. Configure email notifications (optional)
3. Explore the analytics dashboard
4. Try report comparison feature

---

## 💡 Tips

- **First scan takes longer** - MobSF needs to extract and analyze the APK
- **Email notifications** - Configure in Settings → Notifications
- **Authentication** - Default admin user: `admin` / `admin`
- **Reports are saved** - Check `mobsf-ui-backend/reports/` folder
- **Cache improves performance** - Reports are cached for faster access

---

**Made with ❤️ for Mobile Security Analysis**

⭐ **Star this repo** if you find it helpful!

