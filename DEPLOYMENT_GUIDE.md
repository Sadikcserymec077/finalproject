# 🚀 Deployment Guide - Static Analysis Framework

## 📋 Table of Contents
1. [Quick Setup (Development)](#quick-setup-development)
2. [Production Deployment](#production-deployment)
3. [Deployment Options](#deployment-options)
4. [Access Without Installation](#access-without-installation)
5. [Error Troubleshooting](#error-troubleshooting)

---

## 🏃 Quick Setup (Development)

### Prerequisites
- **Node.js 18+** and npm
- **Docker Desktop** (for MobSF)

### Step 1: Start MobSF

```bash
# Pull and run MobSF Docker container
docker pull opensecurity/mobile-security-framework-mobsf:latest
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest
```

**Get API Key:**
1. Open http://localhost:8000
2. Login (default: mobsf/mobsf)
3. Go to API Docs → Copy API Key

### Step 2: Configure Backend

```bash
cd mobsf-ui-backend

# Install dependencies
npm install

# Create .env file
echo "MOBSF_URL=http://localhost:8000" > .env
echo "MOBSF_API_KEY=<your-api-key-here>" >> .env
echo "PORT=4000" >> .env

# Start backend
npm run dev
```

### Step 3: Configure Frontend

```bash
cd mobsf-frontend

# Install dependencies
npm install

# Start frontend
npm start
```

✅ **Access:** http://localhost:3000

---

## 🌐 Production Deployment

### Option 1: Deploy to Vercel (Frontend Only)

```bash
cd mobsf-frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Framework: Create React App
# - Build command: npm run build
# - Output directory: build
```

**Configure Environment:**
- Add REACT_APP_API_BASE in Vercel dashboard → Settings → Environment Variables
- Value: `https://your-backend-url.com`

---

### Option 2: Deploy to Heroku (Backend + Frontend)

#### Backend Deployment

```bash
cd mobsf-ui-backend

# Login to Heroku
heroku login

# Create app
heroku create mobsf-backend

# Set environment variables
heroku config:set MOBSF_URL=<your-mobsf-url>
heroku config:set MOBSF_API_KEY=<your-api-key>
heroku config:set PORT=4000

# Deploy
git init
git add .
git commit -m "Deploy backend"
git push heroku main
```

#### Frontend Deployment

```bash
cd mobsf-frontend

# Create app
heroku create mobsf-frontend

# Set API base
heroku config:set REACT_APP_API_BASE=https://mobsf-backend.herokuapp.com

# Add buildpack
heroku buildpacks:set https://github.com/mars/create-react-app-buildpack

# Deploy
git init
git add .
git commit -m "Deploy frontend"
git push heroku main
```

---

### Option 3: Deploy to VPS (AWS/DigitalOcean/Azure)

#### 1. Setup Server

```bash
# SSH into your server
ssh user@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt-get install nginx
```

#### 2. Deploy Backend

```bash
# Clone repository
git clone <your-repo-url>
cd static-analysis-mobsf-main/mobsf-ui-backend

# Install dependencies
npm install

# Create .env
nano .env
# Add:
# MOBSF_URL=http://localhost:8000
# MOBSF_API_KEY=<your-key>
# PORT=4000

# Start with PM2
pm2 start server.js --name mobsf-backend
pm2 save
pm2 startup
```

#### 3. Deploy Frontend

```bash
cd ../mobsf-frontend

# Build production
npm run build

# Move to nginx directory
sudo cp -r build /var/www/mobsf-frontend
```

#### 4. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/mobsf
```

Add:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/mobsf-frontend;
        try_files $uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mobsf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔗 Access Without Installation

### Option 1: Use Deployed Link

Once deployed to Vercel/Heroku/VPS, share the URL:
- **Frontend:** `https://your-domain.com`
- **Backend API:** `https://your-domain.com/api`

Users can access directly from browser (desktop/mobile).

---

### Option 2: Docker Compose (All-in-One)

Create `docker-compose.yml`:

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

**Share access:** Users can access `http://your-server-ip:3000`

---

## 🐛 Error Troubleshooting

### Common Errors & Solutions

#### 1. **"Cannot connect to MobSF"**

**Cause:** MobSF container not running or wrong URL

**Fix:**
```bash
# Check if MobSF is running
docker ps | grep mobsf

# If not running, start it
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest

# Check .env file has correct MOBSF_URL
cat mobsf-ui-backend/.env
```

---

#### 2. **"API key invalid"**

**Cause:** Wrong API key in `.env`

**Fix:**
1. Go to http://localhost:8000
2. Login → API Docs
3. Copy new API key
4. Update `mobsf-ui-backend/.env`:
   ```
   MOBSF_API_KEY=your-new-key-here
   ```
5. Restart backend: `npm run dev`

---

#### 3. **"Network Error" on upload**

**Cause:** CORS issue or backend not running

**Fix:**
```bash
# Check backend is running
curl http://localhost:4000/api/health

# If not responding, restart
cd mobsf-ui-backend
npm run dev

# Check CORS in server.js
# Ensure: app.use(cors());
```

---

#### 4. **"Port 3000/4000 already in use"**

**Fix:**
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm start
```

---

#### 5. **"Module not found" errors**

**Fix:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

#### 6. **"React hooks error" or blank page**

**Cause:** React version mismatch

**Fix:**
```bash
cd mobsf-frontend
npm install react@19.2.0 react-dom@19.2.0
```

---

#### 7. **"SonarQube analysis failed"**

**Expected:** SonarQube runs in simulated mode by default

**To use real SonarQube:**
1. Install SonarQube: https://www.sonarsource.com/products/sonarqube/downloads/
2. Get token from SonarQube dashboard
3. Add to `mobsf-ui-backend/.env`:
   ```
   SONAR_HOST=http://localhost:9000
   SONAR_TOKEN=your-token-here
   ```
4. Restart backend

---

#### 8. **"PDF download not working"**

**Fix:**
```bash
# Check MobSF container has PDF generation support
docker logs <mobsf-container-id>

# Ensure backend has write permissions
chmod -R 755 mobsf-ui-backend/reports
```

---

#### 9. **Mobile view is broken**

**Fix:**
The app is fully responsive. Clear browser cache:
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

---

#### 10. **GitHub Push Errors**

**Setup:**
```bash
cd static-analysis-mobsf-main

# Initialize git
git init

# Add remote
git remote add origin https://github.com/your-username/your-repo.git

# Add all files
git add .

# Commit
git commit -m "Initial commit - Static Analysis Framework"

# Push
git push -u origin main
```

**If authentication fails:**
```bash
# Use Personal Access Token (PAT)
git remote set-url origin https://<your-token>@github.com/your-username/your-repo.git
git push -u origin main
```

---

## 📱 Mobile Access

The application is **fully responsive** and works on:
- ✅ Desktop (Windows/Mac/Linux)
- ✅ Tablets (iPad, Android tablets)
- ✅ Mobile (iPhone, Android phones)

**To test mobile:**
1. Deploy to any hosting service
2. Access from mobile browser
3. Or use ngrok for local testing:
   ```bash
   npm i -g ngrok
   ngrok http 3000
   ```
   Share the ngrok URL for mobile access.

---

## 🔒 Running Without Docker (Alternative)

To run MobSF without Docker:

1. **Install MobSF locally:**
   ```bash
   git clone https://github.com/MobSF/Mobile-Security-Framework-MobSF.git
   cd Mobile-Security-Framework-MobSF
   ./setup.sh
   ./run.sh
   ```

2. **Update `.env`:**
   ```
   MOBSF_URL=http://127.0.0.1:8000
   ```

---

## ✅ Deployment Checklist

- [ ] MobSF running and accessible
- [ ] Backend `.env` configured with API key
- [ ] Backend running on port 4000
- [ ] Frontend running on port 3000
- [ ] Test upload APK functionality
- [ ] Test SonarQube analysis
- [ ] Test unified report generation
- [ ] Test PDF download
- [ ] Test on mobile device
- [ ] Push code to GitHub
- [ ] Deploy to hosting service

---

## 📞 Support

If you encounter errors not listed here:

1. **Check logs:**
   ```bash
   # Backend logs
   cd mobsf-ui-backend
   npm run dev
   
   # Frontend logs
   cd mobsf-frontend
   npm start
   ```

2. **Browser console:**
   - Press F12 → Console tab
   - Look for red errors

3. **Network tab:**
   - F12 → Network tab
   - Check failed requests

---

## 🎉 Success Indicators

You'll know everything works when:
- ✅ Upload APK shows progress bar
- ✅ MobSF scan completes (green badge)
- ✅ SonarQube runs (blue badge)
- ✅ Unified report shows data from both tools
- ✅ Raw JSON tabs display all reports
- ✅ PDF download works
- ✅ Mobile view is responsive
