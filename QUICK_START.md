# 🚀 Quick Start - One-Click Run

## For Windows Users

**Simply double-click `START.bat`** - That's it! 

The script will automatically:
1. ✅ Check prerequisites (Node.js, Docker)
2. ✅ Install dependencies if needed
3. ✅ Create and configure `.env` file with API key
4. ✅ Start MobSF (Docker)
5. ✅ Start Backend Server
6. ✅ Start Frontend Server
7. ✅ Open browser automatically

## For Linux/Mac Users

Run in terminal:
```bash
npm start
```

Or:
```bash
bash start.sh
```

## First Time Setup

If this is your first time running the project:

1. **Make sure Docker Desktop is running**
2. **Double-click `START.bat`** (Windows) or run `npm start` (Linux/Mac)
3. **Wait for all services to start** (about 15-20 seconds)
4. **Browser will open automatically** at http://localhost:3000

## What Gets Started

- **MobSF**: http://localhost:8000 (Docker container)
- **Backend API**: http://localhost:4000
- **Frontend UI**: http://localhost:3000 (opens automatically)

## Stopping Services

**Windows:**
- Close the command windows that opened
- Run: `cd mobsf-ui-backend && docker-compose down`

**Linux/Mac:**
- Press `Ctrl+C` in the terminal
- Run: `cd mobsf-ui-backend && docker-compose down`

## Troubleshooting

**Docker not running?**
- Start Docker Desktop first, then run `START.bat` again

**Port already in use?**
- Stop any services using ports 3000, 4000, or 8000
- Or change ports in configuration files

**API key issues?**
- The script auto-generates an API key
- If you need to change it, run: `cd mobsf-ui-backend && node setup-api-key.js`

