# Playwright E2E Testing Skill

## Overview
E2E tests are implemented using **Playwright** with a separate test database (`helpdesk_test`). The test database is automatically created before tests and dropped after tests complete.

## Test Database
- **Database:** `helpdesk_test` (separate from development/production)
- **Configuration:** `.env.test` with `TEST_DATABASE_URL`
- **Setup:** `tests/global-setup.ts` - creates DB, runs migrations, seeds data
- **Teardown:** `tests/global-teardown.ts` - drops test DB

## Test Commands

| Command | Description |
|---------|-------------|
| `bun run test` | Run all E2E tests (headless) |
| `bun run test:ui` | Open interactive UI mode |
| `bun run test:headed` | Run with visible browser |
| `bun run test:debug` | Debug mode with Playwright Inspector |
| `bun run test:report` | Show HTML test report |

## Test Configuration

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright configuration |
| `tests/e2e/` | E2E test files |
| `tests/global-setup.ts` | Global setup (DB creation) |
| `tests/global-teardown.ts` | Global teardown (DB cleanup) |
| `tests/db-setup.ts` | Database setup/teardown utilities |
| `.env.test` | Test environment variables |

## Rate Limiting

Rate limiting is **disabled** in development and test environments. It only applies when `NODE_ENV=production`.

| File | Purpose |
|------|---------|
| `backend/src/middleware/rateLimiter.ts` | Rate limiting middleware (production only) |

## Demo Credentials for Testing

```
Email: admin@example.com
Password: password
```
