# 🚀 Deployment Guide - Static Analysis Framework

This guide will help you deploy the Static Analysis Framework to free-tier hosting platforms like Vercel, Railway, or Render.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Options](#deployment-options)
4. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
5. [Backend Deployment](#backend-deployment)
6. [MobSF Setup](#mobsf-setup)
7. [Environment Variables](#environment-variables)
8. [Mobile Responsiveness](#mobile-responsiveness)
9. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

The project consists of three main components:

1. **Frontend** (React) - User interface
2. **Backend** (Node.js/Express) - API proxy server
3. **MobSF** (Python/Docker) - Security analysis engine

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Frontend   │─────▶│   Backend   │─────▶│    MobSF    │
│  (Vercel)   │      │ (Railway/   │      │  (VPS/Docker)│
│             │      │  Render)    │      │             │
└─────────────┘      └─────────────┘      └─────────────┘
```

---

## ✅ Prerequisites

- GitHub account
- Vercel account (free tier)
- Railway/Render account (free tier) for backend
- VPS or Docker host for MobSF (or use Railway/Render)
- Basic knowledge of Git and command line

---

## 🎯 Deployment Options

### Option 1: Full Cloud Deployment (Recommended for Free Tier)
- **Frontend**: Vercel (Free)
- **Backend**: Railway or Render (Free tier available)
- **MobSF**: Railway or Render (Free tier available, but limited)

### Option 2: Hybrid Deployment
- **Frontend**: Vercel (Free)
- **Backend**: Railway or Render (Free tier)
- **MobSF**: Local machine or VPS (requires Docker)

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

1. **Navigate to frontend directory:**
   ```bash
   cd mobsf-frontend
   ```

2. **Create environment file:**
   Create a `.env.production` file:
   ```env
   REACT_APP_API_BASE=https://your-backend-url.railway.app
   ```
   Replace `your-backend-url` with your actual backend URL (you'll get this after deploying the backend).

### Step 2: Deploy to Vercel

#### Method A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd mobsf-frontend
   vercel
   ```

4. **Set environment variables:**
   ```bash
   vercel env add REACT_APP_API_BASE production
   # Enter your backend URL when prompted
   ```

5. **Redeploy with environment variables:**
   ```bash
   vercel --prod
   ```

#### Method B: Using Vercel Dashboard

1. **Push your code to GitHub** (if not already done)

2. **Go to [vercel.com](https://vercel.com)** and sign in

3. **Click "New Project"**

4. **Import your GitHub repository**

5. **Configure project:**
   - **Framework Preset**: React
   - **Root Directory**: `mobsf-frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

6. **Add Environment Variable:**
   - Key: `REACT_APP_API_BASE`
   - Value: `https://your-backend-url.railway.app` (update after backend deployment)

7. **Click "Deploy"**

### Step 3: Update Backend URL

After deployment, update the environment variable in Vercel dashboard:
- Go to Project Settings → Environment Variables
- Update `REACT_APP_API_BASE` with your backend URL
- Redeploy

---

## 🔧 Backend Deployment

### Option A: Railway (Recommended)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   # On Windows/Git Bash, use npx if railway command not found:
   npx @railway/cli login
   # Or if PATH is configured:
   railway login
   ```

3. **Initialize project:**
   ```bash
   cd mobsf-ui-backend
   npx @railway/cli init
   # Or: railway init
   ```

4. **Set environment variables:**
   ```bash
   npx @railway/cli variables set MOBSF_URL=http://your-mobsf-url:8000
   npx @railway/cli variables set MOBSF_API_KEY=your-api-key-here
   npx @railway/cli variables set FRONTEND_URL=https://your-frontend.vercel.app
   ```

5. **Deploy:**
   ```bash
   npx @railway/cli up
   # Or: railway up
   ```

6. **Get your backend URL:**
   ```bash
   npx @railway/cli domain
   # Or: railway domain
   ```

**Note for Windows/Git Bash users:** If `railway` command is not found, use `npx @railway/cli` instead. Alternatively, add `C:\Users\YourUsername\AppData\Roaming\npm` to your PATH environment variable.

### Option B: Render

1. **Go to [render.com](https://render.com)** and sign in

2. **Create New Web Service**

3. **Connect your GitHub repository**

4. **Configure:**
   - **Name**: `mobsf-backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Root Directory**: `mobsf-ui-backend`

5. **Add Environment Variables:**
   - `MOBSF_URL`: `http://your-mobsf-url:8000`
   - `MOBSF_API_KEY`: `your-api-key-here`
   - `NODE_ENV`: `production`

6. **Click "Create Web Service"**

### Option C: Vercel (Serverless Functions)

**Note**: Vercel has limitations for long-running processes. Use this only if you have a separate MobSF instance.

1. **Deploy backend to Vercel:**
   ```bash
   cd mobsf-ui-backend
   vercel
   ```

2. **Set environment variables:**
   ```bash
   vercel env add MOBSF_URL production
   vercel env add MOBSF_API_KEY production
   ```

---

## 🐳 MobSF Setup

MobSF requires Docker and significant resources. Here are your options:

### Option 1: Local MobSF (For Development)

1. **Start MobSF locally:**
   ```bash
   cd mobsf-ui-backend
   docker-compose up -d
   ```

2. **Get API Key:**
   - Access MobSF at `http://localhost:8000`
   - Go to Settings → API Key
   - Copy the API key

3. **Update backend environment:**
   - Set `MOBSF_URL=http://localhost:8000` (only works if backend is also local)
   - For cloud backend, use Option 2 or 3

### Option 2: Railway/Render (Docker Container)

1. **Create a new service on Railway/Render**

2. **Use Docker deployment:**
   - **Dockerfile**: Use MobSF's official Docker image
   - **Image**: `opensecurity/mobsf:latest`

3. **Set environment variables:**
   - `MOBSF_API_KEY`: Generate in MobSF UI
   - Expose port `8000`

4. **Update backend `MOBSF_URL`** to point to this service

### Option 3: VPS/Dedicated Server

1. **Set up a VPS** (DigitalOcean, AWS EC2, etc.)

2. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

3. **Run MobSF:**
   ```bash
   docker run -d -p 8000:8000 opensecurity/mobsf:latest
   ```

4. **Get your VPS IP** and update backend `MOBSF_URL`

---

## 🔐 Environment Variables

### Frontend (.env.production)
```env
REACT_APP_API_BASE=https://your-backend-url.railway.app
```

### Backend
```env
MOBSF_URL=http://your-mobsf-url:8000
MOBSF_API_KEY=your-mobsf-api-key-here
NODE_ENV=production
PORT=4000
```

### MobSF
- API Key is generated in MobSF UI
- Default URL: `http://localhost:8000` (or your deployment URL)

---

## 📱 Mobile Responsiveness

The frontend is fully responsive and optimized for mobile devices:

### Features:
- ✅ Mobile-first design
- ✅ Touch-optimized buttons (44px minimum)
- ✅ Responsive tables with horizontal scroll
- ✅ Adaptive typography
- ✅ Collapsible navigation menu
- ✅ Optimized charts for small screens
- ✅ Landscape orientation support

### Testing:
1. Open your deployed site on a mobile device
2. Test all features:
   - File upload
   - Report viewing
   - Navigation
   - PDF viewing
   - Dark mode toggle

---

## 🐛 Troubleshooting

### Frontend Issues

**Problem**: API calls failing
- **Solution**: Check `REACT_APP_API_BASE` environment variable
- Ensure backend CORS is configured correctly

**Problem**: Build fails on Vercel
- **Solution**: Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`

### Backend Issues

**Problem**: Cannot connect to MobSF
- **Solution**: Verify `MOBSF_URL` is correct
- Check if MobSF is running and accessible
- Verify API key is correct

**Problem**: CORS errors
- **Solution**: Backend already has CORS enabled
- Check if frontend URL is allowed

### MobSF Issues

**Problem**: MobSF not starting
- **Solution**: Check Docker logs: `docker logs <container-id>`
- Ensure port 8000 is not in use
- Check system resources (MobSF needs at least 2GB RAM)

**Problem**: API key not working
- **Solution**: Regenerate API key in MobSF UI
- Update backend environment variable

---

## 📊 Deployment Checklist

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway/Render
- [ ] MobSF running (local or cloud)
- [ ] Environment variables configured
- [ ] Frontend `REACT_APP_API_BASE` points to backend
- [ ] Backend `MOBSF_URL` points to MobSF instance
- [ ] Backend `MOBSF_API_KEY` is set
- [ ] Test file upload
- [ ] Test report generation
- [ ] Test mobile responsiveness
- [ ] Test dark mode
- [ ] Verify CORS is working

---

## 🔗 Quick Links

- **Vercel**: https://vercel.com
- **Railway**: https://railway.app
- **Render**: https://render.com
- **MobSF Docs**: https://mobsf.github.io/docs/

---

## 💡 Tips

1. **Free Tier Limitations:**
   - Vercel: Unlimited deployments, 100GB bandwidth/month
   - Railway: $5 free credit/month
   - Render: Free tier with limitations

2. **Performance:**
   - Use CDN for static assets (Vercel handles this)
   - Enable caching for reports
   - Optimize images before upload

3. **Security:**
   - Never commit `.env` files
   - Use environment variables in deployment platforms
   - Rotate API keys regularly

4. **Monitoring:**
   - Set up error tracking (Sentry, etc.)
   - Monitor API response times
   - Track deployment status

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review deployment logs
3. Verify all environment variables
4. Test each component individually

---

**Happy Deploying! 🚀**

