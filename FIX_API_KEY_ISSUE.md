# Fix for "Unauthorized: /api/" Errors

## Problem
You were seeing repeated "Unauthorized: /api/" errors in MobSF logs. This was caused by the Docker healthcheck trying to access `/api/` endpoint without authentication.

## Solution Applied
1. ✅ Fixed the healthcheck in `docker-compose.yml` to use `/` instead of `/api/`
2. ✅ Increased healthcheck interval to reduce unnecessary checks
3. ✅ Verified API key authentication is working correctly

## How to Apply the Fix

**Option 1: Restart Docker Container (Recommended)**
```bash
cd mobsf-ui-backend
docker-compose down
docker-compose up -d
```

**Option 2: Recreate Container**
```bash
cd mobsf-ui-backend
docker-compose down
docker-compose up -d --force-recreate
```

## Verify the Fix

After restarting, you should:
1. ✅ No more "Unauthorized: /api/" errors in logs
2. ✅ Backend can successfully connect to MobSF
3. ✅ Frontend can upload and analyze APK files

## Test API Connection

To verify the API key is working:
```bash
cd mobsf-ui-backend
node test-api-key.js
```

You should see: `✅ SUCCESS: Authorization header only`

## Current Configuration

- **API Key**: Stored in `mobsf-ui-backend/.env`
- **Authentication**: Using `Authorization` header (working correctly)
- **MobSF URL**: http://localhost:8000
- **Backend URL**: http://localhost:4000

## If Issues Persist

1. **Check API Key Match:**
   ```bash
   # Check key in .env
   cat mobsf-ui-backend/.env | grep MOBSF_API_KEY
   
   # Check key in Docker container
   docker exec mobsf printenv MOBSF_API_KEY
   ```
   Both should show the same key.

2. **Regenerate API Key:**
   ```bash
   cd mobsf-ui-backend
   node generate-api-key.js
   docker-compose restart
   ```

3. **Check Backend Logs:**
   Look for the API key being used (first 6 and last 6 characters should match)

