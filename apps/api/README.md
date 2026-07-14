# Buddy Script API

NestJS backend for the Buddy Script social media platform.

## Tech Stack

- **NestJS** with modular architecture (Auth, User, Post, Comment, Reply modules)
- **Prisma** ORM with PostgreSQL
- **JWT** authentication with access + refresh token rotation
- **bcrypt** for password hashing (10 salt rounds)
- **Redis (Upstash)** for caching feed pages, post summaries, and like lists
- **Uploadthing** for image uploads
- **Swagger** API documentation at `/documentation`

## Scripts

```bash
bun run dev          # Start dev server with watch mode
bun run build        # Type-check and build for production
bun run start        # Run production server
bun run test         # Run tests
bun run lint         # Lint code
```

## Setup

1. Install dependencies from the monorepo root:

```bash
cd ..
bun install
```

2. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your database URL, Redis URL, JWT secret, etc.
```

3. Run database migrations:

```bash
bunx prisma migrate dev
bunx prisma db seed
```

4. Start the dev server:

```bash
bun run dev
```

The API runs on port 3000 by default.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `UPLOADTHING_SECRET` | Uploadthing secret key |
| `UPLOADTHING_APP_ID` | Uploadthing app ID |
| `FRONTEND_URL` | Frontend origin for CORS (e.g., `http://localhost:3001`) |

## API Documentation

Once the server is running, visit `http://localhost:3000/documentation` for the Swagger API reference.

## Database

Prisma schema is located at `prisma/schema.prisma`. Generated client is output to `src/generated/prisma`.

### Key Commands

```bash
bunx prisma generate        # Generate Prisma client
bunx prisma migrate dev     # Run migrations
bunx prisma db seed         # Seed database
bunx prisma studio          # Open Prisma Studio
```

## Architecture

### Modules

- **Auth** - Registration, login, JWT token management, refresh token rotation
- **User** - User profile CRUD
- **Post** - Post creation, feed, visibility control
- **Comment** - Comments on posts
- **Reply** - Threaded replies on comments

### Security

- httpOnly cookies for JWT tokens (prevents XSS)
- CORS configured for frontend origin only
- Rate limiting on all auth endpoints (register: 5/min, login: 10/min, refresh: 20/min)
- Email normalization prevents account duplication
- Strong password requirements enforced at schema and validation layers
- CSRF protection through SameSite cookie attributes

### Performance

- Redis caching for feed, post summaries, and like lists
- Feed version-based invalidation (bump version on data change)
- Cursor-based pagination (O(1) regardless of depth)
- Composite indexes on every query pattern
- Denormalized counters (`commentsCount`, `likesCount`) to avoid COUNT queries
