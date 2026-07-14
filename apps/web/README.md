# Buddy Script Frontend

Next.js frontend for the Buddy Script social media platform.

## Tech Stack

- **Next.js 15** with App Router (server components + client components)
- **SWR** for data fetching with infinite scroll pagination
- **Zustand** for client-side state (current user)
- **Custom CSS** for styling
- **dayjs** for relative timestamps ("2 hours ago")
- **Zod** for runtime type validation on all API responses

## Scripts

```bash
bun run dev          # Start dev server
bun run build        # Build for production
bun run start        # Run production server
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
# Create .env file
API_URL="http://localhost:3000"
```

3. Start the dev server:

```bash
bun run dev
```

The app runs on port 3001 by default.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `API_URL` | Backend API URL (e.g., `http://localhost:3000`) |

## Features

### Authentication

- Email/password registration and login
- JWT tokens stored in httpOnly cookies
- Automatic token refresh
- "Remember me" functionality (saves credentials to localStorage)

### Feed

- Infinite scroll with cursor-based pagination
- Posts sorted newest first
- Support for text and image posts
- Public/private visibility control

### Posts

- Create posts with text and optional images
- Like/unlike with optimistic updates
- Comment count and like count display
- Relative timestamps ("2 hours ago")

### Comments

- Expandable comment section per post
- Optimistic updates for instant feedback
- Like/unlike comments
- Author avatar and name display

### Replies

- Threaded replies on comments
- Nested display with visual hierarchy
- Optimistic updates with rollback on failure
- Expandable reply threads

### Likes

- Like posts, comments, and replies
- Avatar previews (up to 5) on posts
- Tooltip with full list of users who liked
- Per-user like state tracking

## Architecture

### Data Fetching

- Server actions for API calls (keeps server/client boundary clean)
- SWR for client-side data fetching with caching and revalidation
- All API responses validated against Zod schemas

### State Management

- Zustand store for current user state
- SWR cache for server data

### Styling

- Custom CSS with CSS variables for theming
- Dark/light mode support via ThemeToggle component
- Responsive design with Bootstrap grid

## Key Files

- `app/(auth)/` - Login and registration pages
- `app/(home)/` - Main feed and post components
- `components/` - Shared UI components
- `lib/` - Utility functions and API helpers
- `store/` - Zustand state stores
