# ⚡ Quick Deployment Guide

## 🚀 Deploy in 5 Minutes

### Step 1: Deploy Frontend to Vercel (2 minutes)

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend
cd mobsf-frontend

# Login and deploy
vercel login
vercel

# Set environment variable (after backend is deployed)
vercel env add REACT_APP_API_BASE production
# Enter: https://your-backend.railway.app
```

### Step 2: Deploy Backend to Railway (2 minutes)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Navigate to backend
cd mobsf-ui-backend

# Login and deploy (use npx on Windows/Git Bash if railway command not found)
npx @railway/cli login
npx @railway/cli init
npx @railway/cli up

# Set environment variables
npx @railway/cli variables set MOBSF_URL=http://localhost:8000
npx @railway/cli variables set MOBSF_API_KEY=your-api-key
npx @railway/cli variables set FRONTEND_URL=https://your-frontend.vercel.app

# Get your backend URL
npx @railway/cli domain
```

**Windows/Git Bash Note:** If `railway` command is not found, use `npx @railway/cli` instead of just `railway`.

### Step 3: Update Frontend Environment Variable (1 minute)

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `REACT_APP_API_BASE` with your Railway backend URL
3. Redeploy: `vercel --prod`

### Step 4: Set Up MobSF

**Option A: Local (Development)**
```bash
cd mobsf-ui-backend
docker-compose up -d
# Get API key from http://localhost:8000
```

**Option B: Cloud (Production)**
- Deploy MobSF Docker container to Railway/Render
- Update backend `MOBSF_URL` environment variable

## ✅ Done!

Your app is now live at: `https://your-frontend.vercel.app`

## 📱 Mobile Testing

The app is fully responsive. Test on:
- Mobile browser
- Tablet
- Desktop

## 🔧 Troubleshooting

**CORS Errors?**
- Check `FRONTEND_URL` in backend environment variables
- Ensure it matches your Vercel deployment URL

**API Not Working?**
- Verify `REACT_APP_API_BASE` in frontend
- Check backend logs: `railway logs`

**MobSF Connection Failed?**
- Verify `MOBSF_URL` and `MOBSF_API_KEY` in backend
- Check if MobSF is running and accessible

