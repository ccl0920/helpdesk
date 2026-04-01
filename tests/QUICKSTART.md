# Quick Start - E2E Testing

## First Time Setup

```bash
# 1. Install dependencies
bun run install:all

# 2. Create .env.test file (copy from example below)
# See .env.test in project root

# 3. Ensure PostgreSQL is running
# The test database will be created automatically
```

## Running Tests

```bash
# Run all tests (headless)
bun run test

# Run with UI mode (recommended for development)
bun run test:ui

# Run with visible browser
bun run test:headed

# Debug specific test
bun run test:debug
```

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | TestPassword123! |
| Agent | agent@example.com | TestPassword123! |

## .env.test Template

```bash
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/helpdesk_test?schema=public"
VITE_API_URL="http://localhost:3001"
BETTER_AUTH_SECRET="test-secret-key-for-e2e-testing-only"
BETTER_AUTH_URL="http://localhost:3001"
TRUSTED_ORIGINS="http://localhost:5174,http://localhost:3001"
PORT=3001
NODE_ENV=test
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="TestPassword123!"
AGENT_EMAIL="agent@example.com"
AGENT_PASSWORD="TestPassword123!"
```

## Test Files

- `tests/e2e/auth.spec.ts` - Core authentication tests
- `tests/e2e/auth-advanced.spec.ts` - Advanced tests with fixtures
- `tests/fixtures/auth-fixture.ts` - Reusable test fixtures

## Common Commands

```bash
# Run specific test file
bunx playwright test tests/e2e/auth.spec.ts

# Run tests by name pattern
bunx playwright test -g "login"

# Show HTML report
bunx playwright show-report

# Show trace from failed test
bunx playwright show-trace test-results/<test-name>/trace.zip
```

## Troubleshooting

**Database connection error:**
```bash
# Check PostgreSQL is running
psql -h localhost -U postgres -c "SELECT 1"
```

**Port already in use:**
```bash
# Kill processes on ports 3001 and 5173
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

**Tests failing:**
```bash
# Run in debug mode
bun run test:debug

# Or UI mode for interactive debugging
bun run test:ui
```
