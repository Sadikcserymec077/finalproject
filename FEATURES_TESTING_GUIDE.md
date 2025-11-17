# 🧪 Features Testing Guide

## 📧 Email Notifications

### How to Test Email Notifications:

1. **Navigate to Settings:**
   - Click on "⚙️ Settings" in the navigation bar
   - If not logged in, you'll see a login screen (default: `admin` / `admin`)

2. **Configure Email Settings:**
   - Scroll down to "📧 Email Notifications" section
   - Enable "Enable Email Notifications"
   - Fill in your SMTP details:
     - **SMTP Host**: e.g., `smtp.gmail.com` for Gmail
     - **Port**: `587` (for TLS) or `465` (for SSL)
     - **Secure (TLS)**: Toggle ON for TLS
     - **Username**: Your email address
     - **Password**: Your email password (or app-specific password for Gmail)
     - **From Email**: Your email address
     - **To Emails**: Comma-separated list of recipients

3. **Test Email Configuration:**
   - Click "✉️ Test Email" button
   - You should see a success message if email is configured correctly

4. **Enable Alerts:**
   - Toggle "Notify on Scan Completion" - sends email when scan finishes
   - Toggle "Alert on Critical Vulnerabilities" - sends email when critical issues found

5. **Test Notifications:**
   - Upload an APK file
   - Wait for scan to complete
   - Check your email inbox for notification

### Example Gmail Configuration:
```
SMTP Host: smtp.gmail.com
Port: 587
Secure: ON
Username: your-email@gmail.com
Password: your-app-password (not regular password!)
From: your-email@gmail.com
To: recipient@example.com
```

**Note:** For Gmail, you need to:
1. Enable 2-factor authentication
2. Generate an "App Password" from Google Account settings
3. Use the app password (not your regular password)

---

## 🔐 Login / Authentication

### How to Test Login:

1. **Default Login:**
   - Go to Settings page
   - You'll see a login form
   - **Default credentials:**
     - Username: `admin`
     - Password: `admin`

2. **After Login:**
   - You'll see your username in the navigation bar
   - Settings page will show full configuration options
   - You can access protected features

3. **Register New User:**
   - Use the API endpoint: `POST /api/auth/register`
   - Alternatively, insert a row into the `users` table inside `mobsf-ui-backend/data/mobsf-ui.db`
     (any SQLite client/CLI works; passwords must be bcrypt hashes)

4. **Change Password:**
   - After logging in, use `POST /api/auth/change-password`
   - Or update the `users` table in SQLite with a new bcrypt hash

### API Testing (using curl or Postman):

**Login:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

**Register:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"password123","email":"user@example.com","role":"user"}'
```

**Change Password (requires token):**
```bash
curl -X POST http://localhost:4000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"oldPassword":"admin","newPassword":"newpassword"}'
```

---

## 🔗 Shareable Links

### How to Test Shareable Links:

1. **Generate a Shareable Link:**
   - Upload and scan an APK
   - Open the report
   - Scroll down to "🔗 Shareable Links" section
   - Click "➕ Generate Link"
   - Configure options:
     - **Expires At**: Optional expiration date/time
     - **Max Views**: Optional limit on number of views
     - **Password**: Optional password protection
   - Click "Generate Link"
   - Copy the generated link

2. **Access Shared Report:**
   - Open the shared link in a new browser/incognito window
   - If password-protected, enter the password
   - View the report (read-only)

3. **Manage Links:**
   - View all links for a report in the "Shareable Links" section
   - Click "📋 Copy" to copy link to clipboard
   - Click "🗑️ Revoke" to delete a link

4. **Test Link Features:**
   - **Password Protection**: Generate a link with password, try accessing without password
   - **Expiration**: Set expiration date, try accessing after expiration
   - **Max Views**: Set max views to 1, access link twice (second time should fail)

### Example Shareable Link:
```
http://localhost:3000/shared/abc123def456...
```

**Note:** Shareable links work without authentication - anyone with the link can view the report (if not password-protected).

---

## ⏰ Scheduled Scans

### How to Test Scheduled Scans:

1. **Navigate to Settings:**
   - Login first (if not already logged in)
   - Go to Settings page
   - Scroll down to "⏰ Scheduled Scans" section

2. **Add a Scheduled Scan:**
   - Click "➕ Add Scheduled Scan"
   - Fill in the form:
     - **Name**: e.g., "Daily App Scan"
     - **Cron Expression**: e.g., `0 0 * * *` (daily at midnight)
     - **APK URL**: Optional - URL to download APK from
     - **APK Path**: Optional - Local file path
     - **Enabled**: Toggle ON to activate
   - Click "Save"

3. **Cron Expression Examples:**
   ```
   0 0 * * *        - Daily at midnight
   0 */6 * * *      - Every 6 hours
   0 0 * * 0        - Weekly on Sunday
   0 0 1 * *        - Monthly on 1st
   */5 * * * *      - Every 5 minutes (for testing)
   ```

4. **Manage Scheduled Scans:**
   - View all scheduled scans in the table
   - Click "⏸️" to pause or "▶️" to resume
   - Click "✏️" to edit
   - Click "🗑️" to delete

5. **Test Scheduled Scan:**
   - Create a scan with cron: `*/5 * * * *` (every 5 minutes)
   - Wait and check if scan runs automatically
   - Check "Last Run" and "Run Count" columns

**Note:** Scheduled scans require the APK to be accessible (via URL or local path). The scan will automatically trigger at the scheduled time.

---

## 📊 Quick Feature Checklist

### ✅ Email Notifications
- [ ] Configure SMTP settings
- [ ] Test email configuration
- [ ] Upload APK and verify email received
- [ ] Check for critical vulnerability alerts

### ✅ Login/Authentication
- [ ] Login with default credentials (admin/admin)
- [ ] Verify username appears in navbar
- [ ] Access protected settings
- [ ] Test logout functionality

### ✅ Shareable Links
- [ ] Generate a shareable link
- [ ] Access link in new browser
- [ ] Test password protection
- [ ] Test link expiration
- [ ] Revoke a link

### ✅ Scheduled Scans
- [ ] Create a scheduled scan
- [ ] Verify scan appears in list
- [ ] Test pause/resume functionality
- [ ] Edit a scheduled scan
- [ ] Delete a scheduled scan

---

## 🔧 Troubleshooting

### Email Not Working?
- Check SMTP credentials
- Verify firewall/network allows SMTP connections
- For Gmail: Use app password, not regular password
- Check backend logs for error messages

### Login Not Working?
- Verify `mobsf-ui-backend/data/mobsf-ui.db` exists and is writable
- Check if the `users` table contains the expected account
- Try resetting password via API

### Shareable Links Not Working?
- Verify link token is valid
- Check if link has expired
- Verify password if link is password-protected
- Check backend logs for errors

### Scheduled Scans Not Running?
- Verify cron expression is valid
- Check if scan is enabled
- Verify APK URL/path is accessible
- Check backend logs for cron job errors

---

## 📝 API Endpoints Reference

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/change-password` - Change password

### Notifications
- `GET /api/notifications/config` - Get config
- `POST /api/notifications/config` - Update config
- `POST /api/notifications/test-email` - Test email

### Shareable Links
- `POST /api/reports/:hash/share` - Generate link
- `GET /api/shared/:token` - Access shared report
- `GET /api/reports/:hash/links` - Get all links
- `DELETE /api/shared/:token` - Revoke link

### Scheduled Scans
- `GET /api/scheduled-scans` - Get all scans
- `POST /api/scheduled-scans` - Add scan
- `PUT /api/scheduled-scans/:id` - Update scan
- `DELETE /api/scheduled-scans/:id` - Delete scan

