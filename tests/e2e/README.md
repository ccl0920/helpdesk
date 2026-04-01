# E2E Tests - Helpdesk Application

Comprehensive End-to-End tests for the Helpdesk authentication system using Playwright.

## Test Files

| File | Description |
|------|-------------|
| `auth.spec.ts` | Core authentication tests (login, logout, protected routes, RBAC) |
| `auth-advanced.spec.ts` | Advanced tests using fixtures, API mocking, accessibility |
| `../fixtures/auth-fixture.ts` | Reusable test fixtures and helpers |

## Test Coverage

### Authentication Flow
- ✅ Successful login with admin credentials
- ✅ Successful login with agent credentials
- ✅ Session persistence on page refresh

### Login Validation
- ✅ Empty email field validation
- ✅ Empty password field validation
- ✅ Invalid email format validation
- ✅ Invalid credentials error handling

### Logout Flow
- ✅ Session clearance on logout
- ✅ Redirect to login page
- ✅ Protected route access after logout

### Protected Routes
- ✅ Unauthenticated user redirection
- ✅ Authenticated user access to home page

### Role-Based Access Control (RBAC)
- ✅ Admin access to `/users` page
- ✅ Agent blocked from `/users` page (redirected to `/access-denied`)
- ✅ Unauthenticated user redirection to login

### Edge Cases
- ✅ Browser back button after logout
- ✅ Direct URL access to protected routes
- ✅ Demo credentials display (development mode)

### Session Management
- ✅ Session cookie is set after login
- ✅ Session cookie is cleared after logout

### API Response Handling
- ✅ Invalid credentials error (401)
- ✅ Network error handling

### Form Behavior
- ✅ Sign in button disabled during submission
- ✅ Password field is masked (type="password")
- ✅ Email field autocomplete
- ✅ Password field autocomplete

### Accessibility
- ✅ Form labels for email and password
- ✅ Alert role for error messages
- ✅ Descriptive button text
- ✅ Demo credentials section accessibility

### URL Navigation
- ✅ Login page at `/login`
- ✅ Home page redirects to login when unauthenticated
- ✅ Users page redirects to login when unauthenticated
- ✅ Access denied page is accessible

## Prerequisites

1. **PostgreSQL Database**: Ensure PostgreSQL is running
2. **Environment Variables**: `.env.test` file configured
3. **Dependencies**: All packages installed

## Setup

### 1. Configure Test Database

Create `.env.test` in the project root:

```bash
# Test Database
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/helpdesk_test?schema=public"

# Backend API URL for tests
API_BASE_URL="http://localhost:3001"

# Better Auth (test)
BETTER_AUTH_SECRET="test-secret-key-for-e2e-testing-only-do-not-use-in-production"
BETTER_AUTH_URL="http://localhost:3001"

# Trusted Origins
TRUSTED_ORIGINS="http://localhost:5173,http://localhost:3001"

# Server Port
PORT=3001

# Environment
NODE_ENV=test

# Admin User (for seed script)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="TestPassword123!"

# Agent User (for seed script)
AGENT_EMAIL="agent@example.com"
AGENT_PASSWORD="TestPassword123!"
```

### 2. Test Database Setup

The test database (`helpdesk_test`) is automatically:
- **Created** before tests run (via `tests/global-setup.ts`)
- **Migrated** with Prisma schema
- **Seeded** with admin and agent users
- **Dropped** after tests complete (via `tests/global-teardown.ts`)

## Running Tests

```bash
# Run all tests (headless)
bun run test

# Run with UI mode (interactive)
bun run test:ui

# Run with visible browser
bun run test:headed

# Run in debug mode
bun run test:debug

# Generate HTML report
bun run test:report
```

## Test Data

### Seeded Users

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `TestPassword123!` |
| Agent | `agent@example.com` | `TestPassword123!` |

### Test Database

- **Name:** `helpdesk_test`
- **Auto-created:** Yes (before tests)
- **Auto-dropped:** Yes (after tests)

## Test Projects

| Browser | Viewport | Description |
|---------|----------|-------------|
| Desktop Chrome | 1920x1080 | Default desktop browser |

## Fixtures

### `authenticatedPage`
A page already logged in as **admin**. Use for tests requiring admin access:

```typescript
test('admin can access users', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/users');
  await expect(authenticatedPage).toHaveURL('/users');
});
```

### `agentAuthenticatedPage`
A page already logged in as **agent**. Use for tests requiring non-admin access:

```typescript
test('agent cannot access users', async ({ agentAuthenticatedPage }) => {
  await agentAuthenticatedPage.goto('/users');
  await expect(agentAuthenticatedPage).toHaveURL('/access-denied');
});
```

### `loginAsAdmin`
Helper function to log in as admin:

```typescript
test('login as admin', async ({ page, loginAsAdmin }) => {
  await loginAsAdmin(page);
  await expect(page).toHaveURL('/');
});
```

### `loginAsAgent`
Helper function to log in as agent:

```typescript
test('login as agent', async ({ page, loginAsAgent }) => {
  await loginAsAgent(page);
  await expect(page).toHaveURL('/');
});
```

## Application Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Protected | Home page (Dashboard) |
| `/login` | Public | Login page |
| `/users` | Admin Only | User management (placeholder) |
| `/access-denied` | Public | Access denied error page |

## Best Practices Followed

- **User-facing selectors:** `getByRole()`, `getByLabel()`, `getByText()`
- **No hardcoded timeouts:** Using Playwright's auto-wait
- **Test isolation:** Each test is independent
- **Descriptive names:** Clear test descriptions
- **Proper assertions:** Specific, meaningful error messages
- **Parallel execution:** Tests can run in parallel

## Notes

- Tests use a **separate test database** (`helpdesk_test`) to avoid affecting development/production data
- The test database is **automatically created and dropped** for each test run
- **Rate limiting is disabled** in test environment
- All tests use **Desktop Chrome** browser (mobile tests removed)
