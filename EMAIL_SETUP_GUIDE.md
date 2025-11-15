# 📧 Email Notifications Setup Guide

## Common Error: EBADNAME

If you see an error like `❌ queryA EBADNAME sadik.cse.rymec@gmail.com`, it means you've entered an **email address** in the **SMTP Host** field instead of a **server address**.

## ✅ Correct Configuration

### For Gmail:

**SMTP Host:** `smtp.gmail.com` (NOT your email address!)  
**Port:** `587` (for TLS) or `465` (for SSL)  
**Secure (TLS):** `ON` (for port 587) or `OFF` (for port 465)  
**Username:** `your-email@gmail.com`  
**Password:** Your Gmail App Password (see below)  
**From Email:** `your-email@gmail.com`  
**To Emails:** `recipient@example.com`

### For Other Email Providers:

| Provider | SMTP Host | Port | Secure |
|----------|-----------|------|--------|
| Gmail | smtp.gmail.com | 587 | Yes |
| Outlook/Hotmail | smtp-mail.outlook.com | 587 | Yes |
| Yahoo | smtp.mail.yahoo.com | 587 | Yes |
| Custom SMTP | Your server address | 587/465 | Yes/No |

## 🔑 Gmail App Password Setup

Gmail requires an "App Password" instead of your regular password:

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Enable **2-Step Verification** (if not already enabled)
3. Go to **Security** → **2-Step Verification** → **App passwords**
4. Generate a new app password for "Mail"
5. Use this 16-character password (not your regular Gmail password)

## ❌ Common Mistakes

1. **Putting email in SMTP Host:**
   - ❌ Wrong: `sadik.cse.rymec@gmail.com`
   - ✅ Correct: `smtp.gmail.com`

2. **Using regular Gmail password:**
   - ❌ Wrong: Your regular Gmail password
   - ✅ Correct: Gmail App Password

3. **Wrong port/secure combination:**
   - Port 587 → Secure: ON (TLS)
   - Port 465 → Secure: OFF (SSL)

## 🧪 Testing Your Configuration

1. Fill in all SMTP settings
2. Click "✉️ Test Email" button
3. Check for success message
4. Check your email inbox for the test email

## 🔧 Troubleshooting

### Error: "Invalid SMTP host"
- Make sure SMTP Host is a server address (e.g., `smtp.gmail.com`)
- Do NOT use your email address in the host field

### Error: "Authentication failed"
- For Gmail: Use App Password, not regular password
- Check username and password are correct
- Make sure 2FA is enabled (for Gmail)

### Error: "Cannot connect to SMTP server"
- Check your internet connection
- Verify the SMTP host address is correct
- Check if firewall is blocking the connection
- Try different port (587 vs 465)

### Error: "Connection timeout"
- Check if SMTP server is accessible
- Try different port
- Check firewall/network settings

## 📝 Example Configuration

**Gmail Example:**
```
SMTP Host: smtp.gmail.com
Port: 587
Secure: ON
Username: your-email@gmail.com
Password: xxxx xxxx xxxx xxxx (16-char app password)
From: your-email@gmail.com
To: recipient@example.com
```

**Outlook Example:**
```
SMTP Host: smtp-mail.outlook.com
Port: 587
Secure: ON
Username: your-email@outlook.com
Password: your-password
From: your-email@outlook.com
To: recipient@example.com
```

## ✅ Quick Checklist

- [ ] SMTP Host is a server address (not email)
- [ ] Port is correct (587 for TLS, 465 for SSL)
- [ ] Secure toggle matches port
- [ ] Username is your full email address
- [ ] Password is correct (App Password for Gmail)
- [ ] From email is valid
- [ ] To emails are valid and comma-separated
- [ ] Test email button works

