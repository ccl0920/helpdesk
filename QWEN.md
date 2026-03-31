# Project Context: Helpdesk - AI-Powered Ticket Management System

## Project Overview

A full-stack ticket management system that uses AI to automatically classify, respond to, and route support tickets. Built with Express, React, TypeScript, and Bun.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS + React Router + shadcn/ui |
| **Backend** | Express 5 + TypeScript |
| **Runtime** | Bun |
| **Database** | PostgreSQL (with Prisma ORM) - Phase 2 |
| **AI** | Puter.js - Phase 5 |
| **Deployment** | Docker - Phase 10 |

## Project Structure

```
helpdesk/
├── backend/              # Express API server
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   └── index.ts      # Entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   ├── context/      # React context providers
│   │   ├── main.tsx      # Entry point
│   │   └── index.css     # Global styles
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── package.json          # Root package (workspaces)
└── README.md
```

## Development Commands

```bash
# Install all dependencies
bun run install:all

# Run both frontend and backend concurrently
bun run dev

# Run separately
bun run dev:backend    # Backend on http://localhost:3001
bun run dev:frontend   # Frontend on http://localhost:5173

# E2E Tests (Playwright)
bun run test           # Run all E2E tests
bun run test:ui        # Open UI mode
bun run test:headed    # Run with visible browser
bun run test:debug     # Debug mode
bun run test:report    # Show HTML report
```

## Current Phase: Phase 2 (Database Schema & Authentication)

### Completed
- [x] Initialize monorepo structure (frontend/, backend/)
- [x] Set up backend: Node.js + Express + TypeScript
- [x] Set up frontend: React + TypeScript
- [x] Frontend health check API call
- [x] Set up Prisma ORM with PostgreSQL
- [x] Configure DATABASE_URL for helpdesk database
- [x] Generate Prisma client
- [x] Verify full stack runs locally
- [x] Implement Better Auth with email/password
- [x] Implement role-based access control (Admin/Agent roles)
- [x] Create admin-only /users page

### Pending
- [ ] Create initial Prisma migration (Phase 2)

## Next Phase: Phase 2 (Database Schema & Authentication)

- Design Prisma schema (User, Session, Ticket, Category, etc.)
- Create initial migration and seed script
- Implement session middleware
- Build auth routes

## Documentation Resources

### Using Context7 for Up-to-Date Docs

When implementing features, use the Context7 MCP tools to fetch the latest documentation:

1. **Resolve Library ID** - Find the correct library:
   ```
   mcp__context7__resolve-library-id
   - libraryName: <package-name>
   - query: <what you need help with>
   ```

2. **Query Documentation** - Get specific docs:
   ```
   mcp__context7__query-docs
   - libraryId: <resolved-library-id>
   - query: <specific question or task>
   ```

### Key Libraries to Query

| Library | Context7 ID | Use |
|---------|-------------|-----|
| Express | `/expressjs/express` | Backend routes, middleware |
| React | `/facebook/react` | Components, hooks |
| Bun | `/oven-sh/bun` | Runtime, package management |
| Prisma | `/prisma/prisma` | Database ORM (Phase 2) |
| React Router | `/remix-run/react-router` | Routing |
| Tailwind CSS | `/tailwindlabs/tailwindcss` | Styling |

## Implementation Plan Reference

See `implementation-plan.md` for detailed phase breakdown.

## Ticket System Details

### Ticket Statuses
- **Open** — New or actively being worked on
- **Resolved** — Issue has been addressed, awaiting customer confirmation
- **Closed** — Ticket is fully resolved and archived

### Ticket Categories
- **General Question** — Non-technical inquiries
- **Technical Question** — Platform bugs, integration issues
- **Refund Request** — Payment disputes and refund inquiries

### User Roles
| Role | Permissions |
|------|-------------|
| **Admin** | Create/manage agents, view all tickets, full system access, access admin-only routes |
| **Agent** | View and respond to tickets, update ticket status/category |

Access admin status in components:
```typescript
const { user, isAdmin } = useAuth();
// isAdmin returns true if user.role === 'ADMIN'
```

## Notes

- Always use Context7 to fetch up-to-date documentation before implementing new features
- Keep code TypeScript strict mode compliant
- Follow existing project conventions for imports, naming, and structure
- Always use `prisma migrate dev` for development, never `prisma db push`

## shadcn/ui Configuration

### Installed Components
- `button` - Button component with variants (default, secondary, outline, destructive, ghost, link)
- `input` - Form input field with proper styling
- `label` - Form label with proper styling
- `alert` - Alert messages with variants (default, destructive)
- `card` - Card container with Header, Title, Description, Content

### Import Alias
- Use `@/` alias for `src/` directory (configured in `tsconfig.json` and `vite.config.ts`)
- Example: `import { Button } from '@/components/ui/button'`

### Adding New Components
```bash
cd frontend
bunx shadcn@latest add <component-name>
```

### Theme Colors
Use CSS variables for theming (supports light/dark mode):
- `bg-background`, `text-foreground` - Base colors
- `bg-card`, `text-card-foreground` - Card surfaces
- `text-muted-foreground` - Secondary text
- `border-border` - Borders and dividers
- `bg-primary`, `text-primary-foreground` - Primary actions
- `bg-destructive`, `text-destructive-foreground` - Destructive actions

## Authentication

### Overview
Authentication is implemented using **Better Auth** library with email/password credentials and session-based authentication.

### Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/sign-in/email` | Sign in with email and password |
| `POST` | `/api/auth/sign-out` | Sign out and clear session |
| `GET` | `/api/auth/get-session` | Get current session and user |

### Frontend Implementation

#### Auth Context (`src/context/AuthContext.tsx`)
Provides authentication state and methods throughout the app:

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
```

The `User` interface includes a `role` field: `'AGENT' | 'ADMIN'`.

#### useAuth Hook (`src/hooks/useAuth.ts`)
Custom hook to access auth context:
```typescript
const { user, isAuthenticated, login, logout } = useAuth();
```

#### Protected Routes
Use `ProtectedRoute` component to guard authenticated pages:
```typescript
<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>
```

Use `AdminRoute` component to guard admin-only pages:
```typescript
<AdminRoute>
  <YourComponent />
</AdminRoute>
```

#### User Roles
The `User` interface includes a `role` field (`'AGENT' | 'ADMIN'`). The auth context provides an `isAdmin` boolean helper.

### User Interface

#### Login Page (`src/pages/LoginPage.tsx`)
- Email and password form with validation (Zod schema)
- Error handling with shadcn Alert component
- Demo credentials display for testing

#### Demo Credentials
```
Email: admin@example.com
Password: password
```

### Session Management
- Sessions are stored via HTTP-only cookies
- Session is refreshed on app load and after login
- Automatic redirect to `/login` if unauthenticated

### Files Reference

| File | Purpose |
|------|---------|
| `backend/src/index.ts` | Better Auth server setup |
| `backend/src/routes/auth.ts` | Auth route handlers |
| `backend/src/auth.ts` | Better Auth configuration with user roles |
| `frontend/src/context/AuthContext.tsx` | Auth context provider |
| `frontend/src/hooks/useAuth.ts` | Auth hook |
| `frontend/src/pages/LoginPage.tsx` | Login form |
| `frontend/src/components/ProtectedRoute.tsx` | Route guard for authenticated pages |
| `frontend/src/components/AdminRoute.tsx` | Route guard for admin-only pages |
| `frontend/src/pages/UsersPage.tsx` | Admin-only users management page |

## E2E Testing (Playwright)

### Overview
E2E tests are implemented using **Playwright** with a separate test database (`helpdesk_test`). The test database is automatically created before tests and dropped after tests complete.

### Test Database
- **Database:** `helpdesk_test` (separate from development/production)
- **Configuration:** `.env.test` with `TEST_DATABASE_URL`
- **Setup:** `tests/global-setup.ts` - creates DB, runs migrations, seeds data
- **Teardown:** `tests/global-teardown.ts` - drops test DB

### Test Commands

| Command | Description |
|---------|-------------|
| `bun run test` | Run all E2E tests (headless) |
| `bun run test:ui` | Open interactive UI mode |
| `bun run test:headed` | Run with visible browser |
| `bun run test:debug` | Debug mode with Playwright Inspector |
| `bun run test:report` | Show HTML test report |

### Test Configuration

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright configuration |
| `tests/e2e/` | E2E test files |
| `tests/global-setup.ts` | Global setup (DB creation) |
| `tests/global-teardown.ts` | Global teardown (DB cleanup) |
| `tests/db-setup.ts` | Database setup/teardown utilities |
| `.env.test` | Test environment variables |

### Rate Limiting

Rate limiting is **disabled** in development and test environments. It only applies when `NODE_ENV=production`.

| File | Purpose |
|------|---------|
| `backend/src/middleware/rateLimiter.ts` | Rate limiting middleware (production only) |
