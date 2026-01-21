# Quick Start Guide

Follow these steps to get the GitHub Shield Monitor running quickly.

## Prerequisites Check

✅ Node.js 20+ installed  
✅ Docker Desktop installed and running  
✅ Git installed

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Secrets

Run these commands to generate required secrets:

**Windows (PowerShell):**
```powershell
# JWT Secret
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Encryption Key (run again)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Mac/Linux:**
```bash
# JWT Secret
openssl rand -base64 32

# Encryption Key (run again)
openssl rand -base64 32
```

### 3. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

### 4. Create .env File

Create a `.env` file with this content (replace the secrets with your generated values):

```env
# Database
DATABASE_URL="postgresql://shield_monitor:shield_monitor_password@localhost:5432/shield_monitor?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# App URLs
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Secrets (replace with your generated values)
JWT_SECRET="paste-your-jwt-secret-here"
ENCRYPTION_KEY="paste-your-encryption-key-here"

# VAPID Keys (replace with your generated values)
VAPID_PUBLIC_KEY="paste-your-vapid-public-key-here"
VAPID_PRIVATE_KEY="paste-your-vapid-private-key-here"
VAPID_SUBJECT="mailto:admin@example.com"
```

### 5. Start Docker Services

```bash
docker-compose up -d
```

Wait 10-15 seconds for services to start, then verify:

```bash
docker-compose ps
```

Both services should show "Up".

### 6. Initialize Database

```bash
npm run db:generate
npm run db:push
```

### 7. Start the Application

**Terminal 1 - Web Server:**
```bash
npm run dev
```

**Terminal 2 - Worker:**
```bash
npm run worker
```

### 8. Access the App

Open http://localhost:3000 in your browser.

### 9. First Login

1. Enter your email on the login page
2. Click "Send Magic Link"
3. **Check Terminal 1** - you'll see a log with the magic link URL
4. Click that URL to log in

### 10. Add GitHub Token

1. Go to Settings
2. Create a token at https://github.com/settings/tokens
   - Scopes needed: `public_repo`
3. Paste token in Settings and save

### 11. Create Your First Monitor

1. Go to Monitors
2. Click "Create Monitor"
3. Fill in:
   - Name: "Test Monitor"
   - Query Type: "Standard Search"
   - Search Surfaces: Check "code" and "repo"
   - Interval: "1 hour"
   - Notification Threshold: "3"
4. Click "Create"

The monitor will start running automatically!

## Verify Everything Works

✅ Web server running on http://localhost:3000  
✅ Worker process running (check Terminal 2 for logs)  
✅ Can log in with email  
✅ Can add GitHub token  
✅ Can create a monitor  
✅ Monitor shows in list with "active" status  

## Common Issues

**"Cannot connect to database"**
→ Check Docker is running: `docker ps`
→ Restart: `docker-compose restart postgres`

**"Cannot connect to Redis"**
→ Check Docker: `docker ps`
→ Restart: `docker-compose restart redis`

**"Worker not processing"**
→ Ensure worker terminal is running
→ Check Redis connection

**"Magic link not working"**
→ Check Terminal 1 for the link (development mode)
→ Ensure JWT_SECRET is set

## Next Steps

- Create more monitors with different search patterns
- Enable push notifications in Settings
- View results in the Results page
- Triage results by updating their status

For detailed information, see SETUP.md
