# ✅ Setup Checklist

Use this checklist to verify your setup is complete and working.

## Pre-Setup Requirements

- [ ] Node.js v18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Docker Desktop installed and running
- [ ] Git installed (`git --version`)

## One-Click Setup

- [ ] Cloned repository: `git clone <repository-url>`
- [ ] Navigated to project: `cd static-analysis-mobsf-main`
- [ ] Ran setup script:
  - Windows: `setup.bat` or double-click `START.bat`
  - Linux/Mac: `npm start` or `node setup.js`

## Dependencies Installation

- [ ] Root dependencies installed (`npm install` in root)
- [ ] Backend dependencies installed (`cd mobsf-ui-backend && npm install`)
- [ ] Frontend dependencies installed (`cd mobsf-frontend && npm install`)

## Configuration

- [ ] `.env` file created in `mobsf-ui-backend/`
- [ ] `MOBSF_URL` set to `http://localhost:8000`
- [ ] `MOBSF_API_KEY` configured (auto-generated or manual)
- [ ] `PORT` set to `4000` (or custom port)

## Services Running

- [ ] MobSF running on http://localhost:8000
- [ ] Backend API running on http://localhost:4000
- [ ] Frontend UI running on http://localhost:3000
- [ ] Browser opened automatically (or manually opened)

## Verification Tests

### Backend Health Check
- [ ] Backend responds: `curl http://localhost:4000/` or open in browser
- [ ] API endpoints accessible

### MobSF Connection
- [ ] MobSF web interface accessible: http://localhost:8000
- [ ] Can login to MobSF (default: `mobsf` / `mobsf`)
- [ ] API key matches in `.env` file

### Frontend Access
- [ ] Frontend loads: http://localhost:3000
- [ ] No console errors in browser
- [ ] UI displays correctly

## Feature Testing

### Basic Features
- [ ] Can upload APK file
- [ ] Scan completes successfully
- [ ] Report displays correctly
- [ ] Can view MobSF summary
- [ ] Can view unified report
- [ ] Can download PDF report
- [ ] Can download JSON report

### Advanced Features
- [ ] Search and filter works
- [ ] Report comparison works
- [ ] Can add tags to reports
- [ ] Can favorite reports
- [ ] Can archive reports
- [ ] Can delete reports (single and bulk)
- [ ] Analytics dashboard loads
- [ ] CSV export works

### Optional Features
- [ ] Email notifications configured (if using)
- [ ] Authentication works (if using)
- [ ] Can add annotations
- [ ] Can mark false positives

## Troubleshooting

If any item is unchecked:

1. **Dependencies not installed?**
   ```bash
   cd mobsf-ui-backend && npm install
   cd ../mobsf-frontend && npm install
   ```

2. **Services not starting?**
   - Check Docker is running
   - Check ports 3000, 4000, 8000 are free
   - Check `.env` file exists and is configured

3. **API key issues?**
   - Verify MobSF is running
   - Get API key from MobSF Settings
   - Update `mobsf-ui-backend/.env`

4. **Frontend not loading?**
   - Check backend is running
   - Check browser console for errors
   - Verify CORS settings

## Success Criteria

✅ All services running
✅ Can upload and analyze APK
✅ Reports display correctly
✅ No critical errors in console

## Next Steps

Once all items are checked:

1. **Upload a test APK** to verify full functionality
2. **Configure email notifications** (optional)
3. **Set up authentication** (optional)
4. **Explore analytics dashboard**
5. **Try report comparison feature**

---

**Setup Complete!** 🎉

If you encounter any issues, refer to:
- [ONE_CLICK_SETUP.md](ONE_CLICK_SETUP.md) - Detailed setup guide
- [README.md](README.md) - Full documentation
- [Troubleshooting section](README.md#-troubleshooting) - Common issues

