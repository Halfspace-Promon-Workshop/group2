# Complete Setup and Launch Walkthrough

This is a step-by-step visual guide to get your GitHub Shield Monitor up and running.

## Phase 1: Initial Setup (10 minutes)

### Step 1: Verify Prerequisites

Open a terminal and check:

```bash
node --version    # Should be v20.x.x or higher
docker --version  # Should show Docker version
```

If either is missing, install them first.

### Step 2: Install Dependencies

In your project directory:

```bash
npm install
```

**Expected output:** You'll see packages being installed. This takes 1-2 minutes.

### Step 3: Generate Required Secrets

You need three secrets. Run these commands:

#### A. JWT Secret (for authentication)

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Mac/Linux:**
```bash
openssl rand -base64 32
```

**Copy the output** - you'll need it for `.env`

#### B. Encryption Key (for GitHub tokens)

Run the same command again to generate a different key.

#### C. VAPID Keys (for push notifications)

```bash
npx web-push generate-vapid-keys
```

**Expected output:**
```
=======================================

Public Key:
BEl...xyz (long string)

Private Key:
abc...123 (long string)

=======================================
```

**Copy both keys** - you'll need them for `.env`

### Step 4: Create Environment File

Create a file named `.env` in the project root with this template:

```env
# Database
DATABASE_URL="postgresql://shield_monitor:shield_monitor_password@localhost:5432/shield_monitor?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# App URLs
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Replace these with your generated secrets
JWT_SECRET="paste-jwt-secret-here"
ENCRYPTION_KEY="paste-encryption-key-here"

# Replace with your VAPID keys
VAPID_PUBLIC_KEY="paste-public-key-here"
VAPID_PRIVATE_KEY="paste-private-key-here"
VAPID_SUBJECT="mailto:your-email@example.com"
```

**Important:** Replace all the "paste-xxx-here" values with your actual generated secrets.

## Phase 2: Start Services (5 minutes)

### Step 5: Start Docker Services

```bash
docker-compose up -d
```

**Expected output:**
```
Creating network "group2_default" ... done
Creating shield-monitor-postgres ... done
Creating shield-monitor-redis ... done
```

### Step 6: Verify Services Are Running

```bash
docker-compose ps
```

**Expected output:**
```
NAME                      STATUS
shield-monitor-postgres   Up (healthy)
shield-monitor-redis      Up (healthy)
```

If services aren't running, wait 10 seconds and check again. They need time to start.

### Step 7: Initialize Database

```bash
npm run db:generate
```

**Expected output:**
```
✔ Generated Prisma Client
```

Then:

```bash
npm run db:push
```

**Expected output:**
```
✔ Your database is now in sync with your Prisma schema.
```

## Phase 3: Launch Application (2 minutes)

### Step 8: Start Web Server

Open **Terminal 1** and run:

```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 14.0.4
- Local:        http://localhost:3000
- Ready in 2.3s
```

✅ **Keep this terminal open!** The server must keep running.

### Step 9: Start Worker Process

Open **Terminal 2** (new terminal window) and run:

```bash
npm run worker
```

**Expected output:**
```
Starting workers...
Initializing monitors...
Initialized 0 monitors
```

✅ **Keep this terminal open too!** The worker processes scheduled jobs.

## Phase 4: First Use (5 minutes)

### Step 10: Open the Application

Open your browser and go to:

```
http://localhost:3000
```

You should see the **login page** with:
- "Shield Monitor" title
- Email input field
- "Send Magic Link" button

### Step 11: Create Your Account

1. Enter your email address (e.g., `yourname@example.com`)
2. Click **"Send Magic Link"**
3. **Check Terminal 1** - you'll see a log message like:

```
Magic link for yourname@example.com: http://localhost:3000/auth/verify?token=eyJhbGc...
```

4. **Click that URL** (or copy-paste it into your browser)

**Expected result:** You'll be redirected to the main page and logged in.

### Step 12: Add GitHub Token

1. Click **"Settings"** in the navigation bar
2. You'll see the GitHub Token section
3. **Create a GitHub token:**
   - Go to: https://github.com/settings/tokens
   - Click **"Generate new token"** → **"Generate new token (classic)"**
   - Name: `Shield Monitor`
   - Expiration: Choose your preference
   - Scopes: Check **`public_repo`**
   - Click **"Generate token"**
   - **IMPORTANT:** Copy the token immediately (starts with `ghp_`)
4. Back in Shield Monitor, paste the token in the input field
5. Click **"Save Token"**

**Expected result:** Green message "Token configured"

### Step 13: Create Your First Monitor

1. Click **"Monitors"** in the navigation bar
2. Click **"Create Monitor"** button
3. Fill in the form:

   - **Name:** `Shield Security Monitor`
   - **Query Type:** `Standard Search` (pre-configured search)
   - **Search Surfaces:** Check `code` and `repo`
   - **Interval:** `1 hour`
   - **Notification Threshold:** `3` (notify for severity 3+)

4. Click **"Create"**

**Expected result:** 
- Dialog closes
- New monitor appears in the list
- Status shows "active"
- "Next run" shows a time ~1 hour from now

### Step 14: Enable Push Notifications (Optional)

1. Go to **Settings**
2. In the "Push Notifications" section, click **"Enable Push Notifications"**
3. Browser will ask for permission - click **"Allow"**

**Expected result:** Message "Push notifications are enabled"

## Phase 5: Verify Everything Works (2 minutes)

### Check Monitor Status

1. Go to **Monitors**
2. Your monitor should show:
   - ✅ Status: `active` (green badge)
   - ✅ Next run time displayed
   - ✅ No error messages

### Check Worker Logs

Look at **Terminal 2** (worker). You should see:

```
Processing monitor abc-123...
Monitor abc-123 completed: 0 new results
```

(0 results is normal if nothing matches yet)

### Check Results Page

1. Go to **Results**
2. You should see a table (may be empty initially)
3. Filters should work (try selecting different severities)

## Troubleshooting Common Issues

### Issue: "Cannot connect to database"

**Symptoms:** Error messages about database connection

**Solution:**
```bash
# Check Docker is running
docker ps

# Restart PostgreSQL
docker-compose restart postgres

# Wait 10 seconds, then try again
```

### Issue: "Cannot connect to Redis"

**Symptoms:** Worker shows Redis connection errors

**Solution:**
```bash
# Restart Redis
docker-compose restart redis

# Restart the worker (Terminal 2)
# Press Ctrl+C, then run: npm run worker
```

### Issue: Magic link doesn't work

**Symptoms:** Clicking magic link shows error

**Solution:**
- Check Terminal 1 for the actual link
- Ensure JWT_SECRET is set in `.env`
- Try generating a new magic link
- Check the token hasn't expired (1 hour limit)

### Issue: Monitor shows "error" status

**Symptoms:** Monitor status is red with error message

**Common causes:**
- GitHub token invalid or expired
- Rate limited (wait and it will auto-resume)
- Network issues

**Solution:**
- Check GitHub token is valid
- Wait for rate limit to reset
- Check worker logs in Terminal 2

### Issue: No results appearing

**Symptoms:** Monitor runs but finds 0 results

**This is normal if:**
- Your search terms don't match anything on GitHub
- The monitor just started (first run may be empty)

**To test:**
- Create a monitor with a common term like "javascript"
- Wait for it to run
- Check Results page

## What's Next?

Now that everything is running:

1. **Create more monitors** with different search patterns
2. **Adjust notification thresholds** per monitor
3. **Review results** regularly in the Results page
4. **Triage results** by updating their status (new → seen → triaged)
5. **Monitor the worker logs** to see activity

## Stopping the Application

When you're done:

1. **Terminal 1:** Press `Ctrl+C` to stop the web server
2. **Terminal 2:** Press `Ctrl+C` to stop the worker
3. **Optional:** Stop Docker services:
   ```bash
   docker-compose down
   ```

## Restarting Later

To restart the application:

1. Start Docker (if stopped):
   ```bash
   docker-compose up -d
   ```

2. Start web server (Terminal 1):
   ```bash
   npm run dev
   ```

3. Start worker (Terminal 2):
   ```bash
   npm run worker
   ```

That's it! Your GitHub Shield Monitor is now running. 🎉
