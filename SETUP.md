# Setup and Launch Guide

This guide will walk you through setting up and launching the GitHub Shield Monitor application.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 20+** installed ([Download](https://nodejs.org/))
- **Docker Desktop** installed and running ([Download](https://www.docker.com/products/docker-desktop))
- **Git** installed (for cloning the repository)
- A **GitHub Personal Access Token** (we'll create this during setup)

## Step 1: Install Dependencies

First, install all npm packages:

```bash
npm install
```

This will install all required dependencies including Next.js, Prisma, BullMQ, and other packages.

## Step 2: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Now edit the `.env` file and configure the following variables:

### Database Configuration

```env
DATABASE_URL="postgresql://shield_monitor:shield_monitor_password@localhost:5432/shield_monitor?schema=public"
```

This matches the Docker Compose configuration.

### Redis Configuration

```env
REDIS_URL="redis://localhost:6379"
```

### Application URLs

```env
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Generate JWT Secret

Generate a secure JWT secret:

```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Add it to `.env`:

```env
JWT_SECRET="your-generated-secret-here"
```

### Generate Encryption Key

Generate an encryption key for GitHub tokens (use the same command as above):

```env
ENCRYPTION_KEY="your-generated-encryption-key-here"
```

### Generate VAPID Keys for Push Notifications

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

This will output something like:
```
Public Key: BEl...xyz
Private Key: abc...123
```

Add both to `.env`:

```env
VAPID_PUBLIC_KEY="BEl...xyz"
VAPID_PRIVATE_KEY="abc...123"
VAPID_SUBJECT="mailto:your-email@example.com"
```

### Email Configuration (Optional for MVP)

For production, you'll want to configure email sending. For now, you can leave these as placeholders:

```env
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASSWORD="your-email-password"
SMTP_FROM="noreply@example.com"
```

**Note:** In development mode, magic links are logged to the console instead of being emailed.

## Step 3: Start Docker Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

This will:
- Start PostgreSQL on port 5432
- Start Redis on port 6379
- Create persistent volumes for data

Verify the services are running:

```bash
docker-compose ps
```

You should see both `shield-monitor-postgres` and `shield-monitor-redis` with status "Up".

## Step 4: Set Up the Database

Generate the Prisma client:

```bash
npm run db:generate
```

Push the database schema to PostgreSQL:

```bash
npm run db:push
```

This creates all the tables defined in `prisma/schema.prisma`.

**Optional:** Open Prisma Studio to view the database:

```bash
npm run db:studio
```

This opens a web interface at `http://localhost:5555` where you can browse your database.

## Step 5: Start the Application

You need to run **two processes**:

### Terminal 1: Next.js Development Server

```bash
npm run dev
```

This starts the Next.js application on `http://localhost:3000`.

### Terminal 2: Worker Process

Open a new terminal and run:

```bash
npm run worker
```

This starts the BullMQ worker that processes scheduled monitor jobs.

**Important:** Both processes must be running for the application to work properly:
- The Next.js server handles the web UI and API
- The worker process handles scheduled GitHub searches and notifications

## Step 6: Access the Application

Open your browser and navigate to:

```
http://localhost:3000
```

You should see the login page.

## Step 7: Create Your First Account

1. Enter your email address on the login page
2. Click "Send Magic Link"
3. In development mode, check your terminal where `npm run dev` is running
4. You'll see a log message like:
   ```
   Magic link for your@email.com: http://localhost:3000/auth/verify?token=...
   ```
5. Click that link (or copy it to your browser) to complete authentication

**Note:** In production, this link would be sent via email.

## Step 8: Configure GitHub Token

1. After logging in, go to **Settings** (link in the navbar)
2. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a name like "Shield Monitor"
   - Select scopes: `public_repo` (and `read:org` if you need org access)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again)
3. Back in the Shield Monitor app, paste the token in the "GitHub Token" field
4. Click "Save Token"

The token will be encrypted and stored securely.

## Step 9: Enable Push Notifications (Optional)

1. In Settings, click "Enable Push Notifications"
2. Your browser will ask for permission - click "Allow"
3. You should see "Push notifications are enabled"

## Step 10: Create Your First Monitor

1. Go to **Monitors** (link in the navbar)
2. Click "Create Monitor"
3. Fill in the form:
   - **Name**: e.g., "Shield Bypass Detection"
   - **Query Type**: Choose one:
     - **Single Keyword**: Search for a specific term
     - **Collection of Words**: Multiple terms (comma-separated)
     - **Standard Search**: Pre-configured search for "Shield" + bypass terms
   - **Search Surfaces**: Select which GitHub areas to search (code, repo, issues, prs)
   - **Interval**: How often to check (5m, 15m, 1h, 6h)
   - **Notification Threshold**: Minimum severity to trigger notifications (1-5)
4. Click "Create"

The monitor will start running on its schedule. The first run happens immediately if the monitor is enabled.

## Step 11: View Results

1. Go to **Results** (link in the navbar)
2. You'll see any results found by your monitors
3. Use the filters to narrow down results by:
   - Severity (1-5)
   - Status (new/seen/triaged/false_positive)
   - Entity Type (code/repo/issue/pr)
4. Click on a result to see details

## Step 12: Monitor the Worker

Watch the worker terminal to see:
- Monitor execution logs
- GitHub API calls
- Results found
- Any errors

Example output:
```
Processing monitor abc-123-def
Monitor abc-123-def completed: 5 new results
```

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Check Docker is running: `docker ps`
2. Check PostgreSQL is up: `docker-compose ps`
3. Verify DATABASE_URL in `.env` matches docker-compose.yml
4. Try restarting: `docker-compose restart postgres`

### Redis Connection Issues

If you see Redis errors:

1. Check Redis is running: `docker-compose ps`
2. Verify REDIS_URL in `.env`
3. Try restarting: `docker-compose restart redis`

### Worker Not Processing Jobs

1. Ensure the worker process is running (`npm run worker`)
2. Check Redis is accessible
3. Verify monitors are enabled in the database
4. Check worker logs for errors

### Magic Link Not Working

1. In development, check the terminal for the magic link
2. Ensure JWT_SECRET is set in `.env`
3. Check the token hasn't expired (1 hour expiry)

### GitHub API Rate Limits

If you see rate limit errors:

1. Each user has 5,000 requests/hour (authenticated)
2. The worker automatically handles rate limits by rescheduling
3. Consider increasing monitor intervals if hitting limits frequently
4. Check rate limit status in monitor details

### Push Notifications Not Working

1. Ensure VAPID keys are set in `.env`
2. Check browser supports push notifications
3. Verify you granted permission
4. Check browser console for errors
5. Ensure service worker is registered (check DevTools → Application → Service Workers)

## Production Deployment

For production deployment:

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

3. **Set production environment variables** (use a secrets manager)

4. **Start the application:**
   ```bash
   npm start
   ```

5. **Start the worker:**
   ```bash
   npm run worker
   ```

6. **Set up a process manager** (PM2, systemd, etc.) to keep both processes running

7. **Configure email sending** for magic links

8. **Set up monitoring and logging** (e.g., Sentry, DataDog)

## Next Steps

- Create multiple monitors for different search patterns
- Configure notification thresholds per monitor
- Review and triage results regularly
- Set up email notifications (Phase 2)
- Add team collaboration features (Phase 2)

## Support

If you encounter issues:

1. Check the logs in both terminals
2. Review the README.md for architecture details
3. Check Prisma Studio to inspect database state
4. Verify all environment variables are set correctly

Happy monitoring! 🛡️
