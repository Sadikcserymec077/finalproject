# 🚀 Getting Started - Quick Reference

## For New Users

**Welcome!** This guide will get you up and running in under 5 minutes.

---

## Step 1: Prerequisites (5 minutes)

Install these if you don't have them:

1. **Node.js** (v18+) - [Download](https://nodejs.org/)
2. **Docker Desktop** - [Download](https://www.docker.com/)
3. **Git** - [Download](https://git-scm.com/)

**Verify installation:**
```bash
node --version    # Should show v18 or higher
docker --version  # Should show Docker version
git --version     # Should show Git version
```

---

## Step 2: Clone & Setup (2 minutes)

### Windows
```bash
git clone <repository-url>
cd static-analysis-mobsf-main
setup.bat
```

### Linux/Mac
```bash
git clone <repository-url>
cd static-analysis-mobsf-main
node setup.js
```

The setup script will:
- ✅ Install all dependencies
- ✅ Create configuration files
- ✅ Set up API keys

---

## Step 3: Start Everything (1 click)

### Windows
**Double-click `START.bat`**

### Linux/Mac
```bash
npm start
```

That's it! The browser will open automatically.

---

## Step 4: Verify It Works

1. **Check services are running:**
   - Frontend: http://localhost:3000 ✅
   - Backend: http://localhost:4000 ✅
   - MobSF: http://localhost:8000 ✅

2. **Upload a test APK:**
   - Go to Dashboard
   - Click "Choose File"
   - Select an APK
   - Click "Upload & Analyze"
   - Wait for scan to complete

3. **View the report:**
   - Click on the scan result
   - Explore different report views
   - Try exporting PDF/JSON

---

## What You Get

✅ **Full-featured security analysis platform**
✅ **All latest features included**
✅ **No additional configuration needed**

---

## Need Help?

- **Detailed Setup:** [ONE_CLICK_SETUP.md](ONE_CLICK_SETUP.md)
- **Full Documentation:** [README.md](README.md)
- **Troubleshooting:** [README.md#troubleshooting](README.md#-troubleshooting)
- **Setup Checklist:** [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)

---

## Quick Commands Reference

```bash
# Start everything
npm start              # Cross-platform
start.bat              # Windows
bash start.sh           # Linux/Mac

# Setup (first time)
setup.bat               # Windows
node setup.js           # Linux/Mac

# Individual services
npm run mobsf          # Start MobSF only
npm run backend        # Start backend only
npm run frontend       # Start frontend only

# Stop services
npm run stop           # Stop all
docker-compose down    # Stop MobSF
```

---

**That's it! You're ready to analyze APKs! 🎉**

