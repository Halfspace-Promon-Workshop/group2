# GitHub Token Setup Required

## Issue
Your monitor is failing with: **"User has no GitHub token configured"**

This means you need to add a GitHub Personal Access Token before monitors can run.

## How to Fix

### Step 1: Create a GitHub Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Fill in:
   - **Note**: `Shield Monitor` (or any name you prefer)
   - **Expiration**: Choose your preference (30 days, 90 days, or no expiration)
   - **Scopes**: Check **`public_repo`** (this allows searching public repositories)
4. Click **"Generate token"** at the bottom
5. **IMPORTANT**: Copy the token immediately (it starts with `ghp_`). You won't be able to see it again!

### Step 2: Add Token to Shield Monitor

1. Open your Shield Monitor app: http://localhost:3000
2. Make sure you're logged in
3. Go to **Settings** (link in the navigation bar)
4. In the "GitHub Token" section:
   - Paste your token in the input field
   - Click **"Save Token"**
5. You should see: "Token configured" message

### Step 3: Verify Monitor Works

1. Go to **Monitors** page
2. Your monitor should now show "active" status (instead of "error")
3. The error message should be gone
4. The monitor will run on its next scheduled time

## Troubleshooting

**"Invalid GitHub token" error:**
- Make sure you copied the entire token (starts with `ghp_`)
- Check that the token hasn't expired
- Verify you selected the `public_repo` scope

**Monitor still shows error:**
- Wait a few seconds for the status to update
- Check the worker terminal for any new errors
- Try refreshing the Monitors page

**Token not saving:**
- Make sure you're logged in
- Check browser console for errors (F12)
- Try logging out and back in

## After Adding Token

Once you've added your GitHub token:
- Monitors will automatically start working
- The worker will process them on schedule
- Results will appear in the Results page
- You'll get notifications for high-severity findings

## Security Note

Your GitHub token is encrypted and stored securely. Only you can see it, and it's never logged or exposed.
