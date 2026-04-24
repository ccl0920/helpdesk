# Project Context: Helpdesk

Full-stack ticket management system. Express 5 backend + React 19 frontend, Bun workspaces.

## Monorepo Boundaries

```
backend/     Express API, Prisma, Better Auth
frontend/    React + Vite + Tailwind + shadcn/ui
common/      Shared Zod schemas (@helpdesk/common)
```

- **Backend entry:** `backend/src/index.ts`
- **Frontend entry:** `frontend/src/main.tsx`
- **Common entry:** `common/src/index.ts` (exported as `@helpdesk/common`)

## Developer Commands

```bash
# Install everything
bun run install:all

# Run both frontend + backend concurrently
bun run dev

# Run separately
bun run dev:backend    # http://localhost:3001
bun run dev:frontend   # http://localhost:5173

# E2E tests (Playwright)
bun run test           # headless
bun run test:ui        # interactive UI mode
bun run test:report    # HTML report

# Component tests (Vitest) — from frontend/ directory
bun run test           # watch mode
bun run test:run       # CI mode
```

## Database (PostgreSQL + Prisma)

- Schema: `backend/prisma/schema.prisma`
- Prisma config: `backend/prisma.config.ts` (uses `defineConfig`, seed at `prisma/seed.ts`)
- **Always use `prisma migrate dev` for schema changes**, never `prisma db push`
- Dev commands (run from `backend/`):
  - `bun run db:generate`
  - `bun run db:migrate`
  - `bun run db:studio`
  - `bun run db:seed`

## Authentication (Better Auth)

- Uses `better-auth` with Prisma adapter, not custom session middleware
- Email/password only; **`disableSignUp: true`** — users must be created by an admin
- Role field added via Better Auth `additionalFields` (`AGENT` | `ADMIN`)
- Admin plugin enabled with `ADMIN_USER_IDS` env var
- Backend routes: `/api/auth/*splat` → `toNodeHandler(auth)`
- Frontend auth context: `frontend/src/context/AuthContext`
- Password min length: 12 (enforced by Better Auth config)

## Testing

### E2E (Playwright)
- Uses **separate test database** (`helpdesk_test`) auto-created before tests and dropped after
- Config: `playwright.config.ts`, env from `backend/.env.test`
- E2E tests: `tests/e2e/`
- Auth fixtures: `tests/fixtures/auth-fixture.ts`
- **Playwright baseURL is `http://localhost:5174`** (not 5173)
- Playwright spins up its own frontend on `PORT=5174` via `webServer` config
- Rate limiting is **disabled** in dev/test; only active when `NODE_ENV=production`

### Component Tests (Vitest + MSW)
- Config: `frontend/vitest.config.ts`
- Test files live next to components (e.g., `src/pages/UsersPage.test.tsx`)
- Custom render with providers: `frontend/src/test/test-utils.tsx`
- BigInt serialization patched in `frontend/src/test/setup.ts` to match backend behavior

## Shared Code Rules

### All Zod Schemas Go in `common/`
Do NOT define Zod schemas locally in frontend or backend. Place them in `common/src/schemas/` and export from `common/src/index.ts`.

### Use the `Role` Enum
Always use `frontend/src/lib/role.ts` instead of magic strings:
```typescript
import { Role } from '@/lib/role';
// Correct: Role.ADMIN, Role.AGENT
// Incorrect: 'ADMIN', 'AGENT'
```

## Reusable Error Components

- **Form field errors:** `FormFieldError` from `@/components/ui/form-field-error`
- **General errors:** `ErrorMessage` from `@/components/ui/error-message`

Do not duplicate error markup.

## Email Ingestion

Controlled by `EMAIL_PROVIDER` env var:
- `imap` — polls IMAP mailbox
- `webhook` — accepts POST at `/api/email/webhook`
- `both` — enables both
- `none` — disabled (default)

IMAP config vars: `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASSWORD`, `IMAP_TLS`, `IMAP_MAILBOX`, `EMAIL_POLLING_INTERVAL`

## Backend Quirks

- **BigInt serialization:** Patched on `BigInt.prototype.toJSON` in `backend/src/index.ts` so Prisma `BigInt` IDs serialize correctly in JSON responses.
- **CORS:** Must list trusted origins in `TRUSTED_ORIGINS` env var (comma-separated) for cookies to work across ports.
- **Security headers:** Custom helmet CSP configured; additional headers set in middleware.
- **Graceful shutdown:** On `SIGINT`/`SIGTERM`, stops IMAP polling then disconnects Prisma.
