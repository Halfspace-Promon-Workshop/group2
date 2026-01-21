# GitHub Shield Monitor

A production-ready web application that continuously monitors GitHub for potentially harmful content related to the cybersecurity product "Shield" (workarounds, bypasses, PoCs, exploit instructions) and alerts users.

## Features

- **Monitor Creation**: Create monitors with keyword, collection, or standard search modes
- **Scheduled Searches**: Automatically query GitHub on adjustable intervals (5m, 15m, 1h, 6h)
- **Severity Scoring**: Each result is assigned a severity score (1-5) with explanations
- **Web Push Notifications**: Get notified when new high-severity results are found
- **Results Management**: View, filter, and triage results with a comprehensive UI
- **Secure Token Storage**: GitHub tokens are encrypted using AES-256-GCM
- **Rate Limiting**: Built-in protection against abuse

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: BullMQ with Redis
- **Authentication**: Email magic link (JWT)
- **Notifications**: Web Push API (VAPID)

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 15+ (via Docker)
- Redis 7+ (via Docker)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd github-shield-monitor
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Generate with `openssl rand -base64 32`
- `ENCRYPTION_KEY`: Generate with `openssl rand -base64 32`
- `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: Generate with `npx web-push generate-vapid-keys`

4. Start Docker services:
```bash
docker-compose up -d
```

5. Set up the database:
```bash
npm run db:generate
npm run db:push
```

6. Start the development server:
```bash
npm run dev
```

7. Start the worker process (in a separate terminal):
```bash
npm run worker
```

The application will be available at `http://localhost:3000`.

## Usage

1. **Sign In**: Use the email magic link authentication
2. **Add GitHub Token**: Go to Settings and add your GitHub Personal Access Token
3. **Create Monitor**: Create a monitor with your search criteria
4. **Enable Notifications**: Enable push notifications in Settings
5. **View Results**: Check the Results page for detected content

## Project Structure

```
├── src/
│   ├── app/              # Next.js app router pages and API routes
│   ├── components/       # React components
│   ├── lib/              # Shared utilities and services
│   └── worker/           # BullMQ worker process
├── prisma/               # Database schema
├── public/               # Static assets
└── docker-compose.yml    # Docker services configuration
```

## API Endpoints

- `POST /api/auth/login` - Request magic link
- `GET /api/auth/verify` - Verify magic link token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `GET /api/monitors` - List monitors
- `POST /api/monitors` - Create monitor
- `PATCH /api/monitors/[id]` - Update monitor
- `DELETE /api/monitors/[id]` - Delete monitor
- `GET /api/results` - List results (with filters)
- `GET /api/results/[id]` - Get result details
- `PATCH /api/results/[id]` - Update result status
- `POST /api/github-token` - Save GitHub token
- `GET /api/notifications/vapid-public-key` - Get VAPID public key
- `POST /api/notifications/subscribe` - Subscribe to push notifications

## Worker Process

The worker process (`src/worker/index.ts`) handles:
- Scheduled monitor execution
- GitHub API searches
- Severity scoring
- Result deduplication
- Push notification dispatch

Run with: `npm run worker`

## Security Features

- **Token Encryption**: GitHub tokens encrypted with AES-256-GCM
- **Rate Limiting**: API endpoints protected with rate limits
- **Input Sanitization**: All user input is sanitized
- **Audit Logging**: All actions are logged for compliance
- **XSS Protection**: HTML content sanitized with DOMPurify

## Development

- Run linting: `npm run lint`
- Open Prisma Studio: `npm run db:studio`
- Generate Prisma client: `npm run db:generate`

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables

3. Run migrations:
```bash
npm run db:migrate
```

4. Start the application:
```bash
npm start
```

5. Start the worker process:
```bash
npm run worker
```

## License

MIT
