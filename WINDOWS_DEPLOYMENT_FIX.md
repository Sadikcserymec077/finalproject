# 🔧 Windows/Git Bash Railway CLI Fix

## Problem
After installing Railway CLI with `npm install -g @railway/cli`, the `railway` command is not found in Git Bash.

## Solution Options

### Option 1: Use npx (Recommended - No PATH changes needed)

Instead of using `railway` directly, use `npx @railway/cli`:

```bash
# Instead of: railway login
npx @railway/cli login

# Instead of: railway init
npx @railway/cli init

# Instead of: railway up
npx @railway/cli up

# Instead of: railway variables set KEY=value
npx @railway/cli variables set KEY=value

# Instead of: railway domain
npx @railway/cli domain
```

### Option 2: Add npm global bin to PATH

1. **Find your npm global bin directory:**
   ```bash
   npm config get prefix
   ```
   This usually returns: `C:\Users\YourUsername\AppData\Roaming\npm`

2. **Add to PATH:**
   - Open System Properties → Environment Variables
   - Edit "Path" in User variables
   - Add: `C:\Users\YourUsername\AppData\Roaming\npm`
   - Click OK and restart your terminal

3. **Verify:**
   ```bash
   railway --version
   ```

### Option 3: Use PowerShell instead of Git Bash

PowerShell usually has better PATH handling:

```powershell
# In PowerShell
npm install -g @railway/cli
railway login
railway init
railway up
```

### Option 4: Create an alias in Git Bash

Add to your `~/.bashrc` or `~/.bash_profile`:

```bash
alias railway='npx @railway/cli'
```

Then reload:
```bash
source ~/.bashrc
```

## Quick Test

Test if Railway CLI works:

```bash
npx @railway/cli --version
```

Should output: `railway 4.11.1` (or similar version)

## Updated Deployment Commands

Here are the corrected commands for Windows/Git Bash:

```bash
cd mobsf-ui-backend

# Login
npx @railway/cli login

# Initialize
npx @railway/cli init

# Set environment variables
npx @railway/cli variables set MOBSF_URL=http://your-mobsf-url:8000
npx @railway/cli variables set MOBSF_API_KEY=your-api-key-here
npx @railway/cli variables set FRONTEND_URL=https://your-frontend.vercel.app

# Deploy
npx @railway/cli up

# Get domain
npx @railway/cli domain
```

## Alternative: Use Railway Web Dashboard

If CLI continues to cause issues, you can:

1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Set environment variables in the dashboard
5. Deploy automatically

This avoids CLI issues entirely!

---

**Recommendation:** Use `npx @railway/cli` for all commands - it works reliably on all platforms without PATH configuration.

