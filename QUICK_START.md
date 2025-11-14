# 🚀 Quick Start Guide

## ⚡ Fastest Way to Run

### Windows (Automated)
```bash
setup.bat
```
Then follow the on-screen instructions.

---

## 🐳 Manual Setup (3 Steps)

### Step 1: Start MobSF
```bash
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest
```
- Open http://localhost:8000
- Login: `mobsf` / `mobsf`
- Copy API key from API Docs

### Step 2: Start Backend
```bash
cd mobsf-ui-backend
npm install

# Create .env file:
echo MOBSF_URL=http://localhost:8000 > .env
echo MOBSF_API_KEY=your-api-key-here >> .env
echo PORT=4000 >> .env

npm run dev
```

### Step 3: Start Frontend
```bash
cd mobsf-frontend
npm install
npm start
```

✅ **Open:** http://localhost:3000

---

## 📱 Test on Mobile

**Option 1: Deploy to cloud** (see DEPLOYMENT_GUIDE.md)

**Option 2: Use ngrok**
```bash
npm i -g ngrok
ngrok http 3000
```
Access the ngrok URL from your phone.

---

## 🎯 What to Do After Setup

1. **Upload APK** - Drag & drop or browse
2. **Wait for scan** - Progress bar shows status
3. **View reports**:
   - MobSF Summary
   - Unified Report (combined analysis)
   - Raw JSON (individual tool outputs)

---

## 🆘 Quick Fixes

### "Cannot connect to MobSF"
```bash
# Check MobSF is running
docker ps | grep mobsf

# If not, start it:
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest
```

### "Port already in use"
```bash
npx kill-port 3000
npx kill-port 4000
```

### "Module not found"
```bash
cd mobsf-ui-backend
rm -rf node_modules package-lock.json
npm install

cd ../mobsf-frontend
rm -rf node_modules package-lock.json
npm install
```

### "API key invalid"
1. Go to http://localhost:8000
2. Login → API Docs
3. Copy new API key
4. Update `mobsf-ui-backend/.env`
5. Restart backend

---

## 📚 Full Documentation

- **DEPLOYMENT_GUIDE.md** - Complete deployment instructions
- **CHANGES_SUMMARY.md** - What changed in this version
- **README.md** - Project overview

---

## ✅ Verify It's Working

You should see:

1. **Upload page** with APK file selector
2. **Recent Scans** list on the left
3. **Report Panel** on the right
4. **Navigation** at top (Dashboard, Reports, Settings)

After uploading:
- ✅ Progress bar animates
- ✅ Status changes to "Scanning" → "Running Tools" → "Ready"
- ✅ Report appears automatically

---

## 🎉 That's It!

Your Static Analysis Framework is now running.

**Need help?** Check DEPLOYMENT_GUIDE.md for troubleshooting.
