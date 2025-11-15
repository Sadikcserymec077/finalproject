# 📧 Simple Email Setup - Two Options

## Option 1: SendGrid (EASIEST - Recommended) ⭐

SendGrid is much simpler - you just need an API key, no SMTP configuration!

### Steps:

1. **Sign up for SendGrid** (Free tier: 100 emails/day)
   - Go to: https://signup.sendgrid.com/
   - Create a free account

2. **Get your API Key:**
   - Login to SendGrid Dashboard
   - Go to: Settings → API Keys
   - Click "Create API Key"
   - Name it (e.g., "MobSF Notifications")
   - Select "Full Access" or "Mail Send" permissions
   - Copy the API key (starts with `SG.`)

3. **Configure in Settings:**
   - Go to Settings → Email Notifications
   - Select "SendGrid (API Key - Easier)" from dropdown
   - Paste your API key
   - Enter your email in "From Email"
   - Enter recipient email(s) in "To Emails"
   - Click "Save Settings"
   - Click "Test Email"

**That's it!** No SMTP host, port, or password needed.

---

## Option 2: SMTP (Gmail, Outlook, etc.)

If you prefer to use your own email provider:

### For Gmail:

1. **Enable 2-Step Verification** in Google Account
2. **Generate App Password:**
   - Go to: https://myaccount.google.com/security
   - 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Configure:**
   - SMTP Host: `smtp.gmail.com`
   - Port: `587`
   - Secure: `ON`
   - Username: `your-email@gmail.com`
   - Password: `xxxx xxxx xxxx xxxx` (16-char app password)
   - From: `your-email@gmail.com`
   - To: `recipient@example.com`

---

## 🎯 Quick Comparison

| Feature | SendGrid | SMTP |
|---------|----------|------|
| Setup Complexity | ⭐ Easy | ⭐⭐⭐ Complex |
| Requires | API Key only | Host, Port, Username, Password |
| Free Tier | 100 emails/day | Depends on provider |
| Configuration | 2 fields | 7+ fields |
| Best For | Quick setup | Using existing email |

---

## 💡 Recommendation

**Use SendGrid** if you want the simplest setup. It's free for 100 emails/day and requires just an API key!

