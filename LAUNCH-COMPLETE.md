# 🎉 Application Launch Complete!

Your GitHub Shield Monitor is now running!

## ✅ What's Running

1. **Docker Services** ✅
   - PostgreSQL (port 5432) - Running
   - Redis (port 6379) - Running

2. **Database** ✅
   - Schema created and synced
   - Prisma client generated

3. **Web Server** ✅
   - Next.js dev server running
   - Access at: http://localhost:3000

## 🚀 Next Steps

### 1. Start the Worker Process

**IMPORTANT:** You need to start the worker in a **separate terminal window**.

**Option A - PowerShell:**
```powershell
.\START-WORKER.ps1
```

**Option B - Manual:**
```powershell
npm run worker
```

The worker processes scheduled monitor jobs and sends notifications.

### 2. Access the Application

Open your browser and go to:
```
http://localhost:3000
```

### 3. Create Your Account

1. Enter your email address
2. Click "Send Magic Link"
3. **Check the terminal where `npm run dev` is running**
4. You'll see a log message with the magic link URL
5. Click that URL to complete login

### 4. Add GitHub Token

1. Go to **Settings** (after logging in)
2. Create a GitHub Personal Access Token:
   - Visit: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name: `Shield Monitor`
   - Scope: Check `public_repo`
   - Click "Generate token"
   - **Copy the token** (starts with `ghp_`)
3. Paste it in Settings and click "Save Token"

### 5. Create Your First Monitor

1. Go to **Monitors**
2. Click **"Create Monitor"**
3. Fill in:
   - Name: "Shield Security Monitor"
   - Query Type: "Standard Search"
   - Search Surfaces: Check "code" and "repo"
   - Interval: "1 hour"
   - Notification Threshold: "3"
4. Click "Create"

The monitor will start running automatically!

## 📊 Verify Everything Works

Check these:

- ✅ Web server: http://localhost:3000 loads
- ✅ Worker: Terminal 2 shows "Starting workers..." and "Initialized X monitors"
- ✅ Can log in with email
- ✅ Can add GitHub token
- ✅ Can create a monitor
- ✅ Monitor shows "active" status

## 🛠️ Managing the Application

### Stop the Application

**Terminal 1 (Web Server):**
- Press `Ctrl+C` to stop

**Terminal 2 (Worker):**
- Press `Ctrl+C` to stop

**Docker Services (Optional):**
```powershell
docker compose down
```

### Restart Later

1. Start Docker (if stopped):
   ```powershell
   docker compose up -d
   ```

2. Start web server:
   ```powershell
   npm run dev
   ```

3. Start worker (separate terminal):
   ```powershell
   npm run worker
   ```

## 📝 Important Notes

- **Two terminals required:** Web server and worker must both run
- **Magic links in dev:** Check terminal for the link (not emailed)
- **GitHub token needed:** Users must add their own token
- **Worker must run:** Monitors won't execute without the worker

## 🐛 Troubleshooting

**Can't connect to database?**
```powershell
docker compose restart postgres
```

**Can't connect to Redis?**
```powershell
docker compose restart redis
```

**Worker not processing?**
- Ensure worker terminal is running
- Check Redis is up: `docker compose ps`

**Application not loading?**
- Check Terminal 1 for errors
- Verify port 3000 is not in use
- Try restarting: `npm run dev`

## 🎯 What You Can Do Now

1. **Create monitors** with different search patterns
2. **View results** in the Results page
3. **Triage results** by updating status
4. **Enable push notifications** in Settings
5. **Monitor activity** in the worker terminal

Enjoy monitoring! 🛡️
