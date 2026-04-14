# Project Context: Helpdesk - AI-Powered Ticket Management System

## Project Overview

A full-stack ticket management system that uses AI to automatically classify, respond to, and route support tickets. Built with Express, React, TypeScript, and Bun.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS + React Router + shadcn/ui + **TanStack Query** + **Axios** |
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
├── common/               # Shared schemas and types
│   ├── src/
│   │   ├── schemas/      # Zod schemas
│   │   └── index.ts      # Package entry point
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

### Using the Role Enum

The frontend defines a `Role` enum that matches the Prisma schema. **Always use this enum instead of magic strings** when working with user roles.

```typescript
import { Role } from '@/lib/role';

// ✅ Correct
if (user.role === Role.ADMIN) { ... }
role: Role.AGENT

// ❌ Incorrect - don't use magic strings
if (user.role === 'ADMIN') { ... }
role: 'AGENT'
```

The enum is defined in `frontend/src/lib/role.ts`:
```typescript
export enum Role {
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
}
```

Use `Role` type in interfaces and `z.enum([Role.AGENT, Role.ADMIN])` for Zod validation.

## Shared Code (Common Package)

### Overview
The `@helpdesk/common` package contains shared Zod schemas, enums, constants, and types that are used by both frontend and backend for consistent validation and type safety.

### Rule: All Zod Schemas Go in `common/`

**Going forward, all Zod schemas must be defined in the `common/src/schemas/` folder.** This includes:
- Form validation schemas (create, update, etc.)
- Query parameter validation schemas (pagination, filtering, sorting, etc.)
- Any other Zod schemas used by frontend or backend for validation

**Do NOT define Zod schemas locally in frontend or backend files.** Always place them in `common/src/schemas/` and export them.

### Project Structure
```
common/
├── src/
│   ├── schemas/
│   │   ├── user.ts       # User-related schemas
│   │   └── ticket.ts     # Ticket-related schemas, enums, and query schemas
│   └── index.ts          # Package entry point (exports all schemas)
├── package.json
└── tsconfig.json
```

### Defining Zod Schemas

1. **Create a new schema file** in `common/src/schemas/`:
   ```typescript
   // common/src/schemas/user.ts
   import { z } from 'zod';

   export const createUserSchema = z.object({
     name: z.string().trim().min(3, 'Name must be at least 3 characters'),
     email: z.string().email('Invalid email format'),
     password: z.string().min(8, 'Password must be at least 8 characters'),
     role: z.enum(['AGENT', 'ADMIN'], { message: 'Role must be AGENT or ADMIN' }),
   });

   export type CreateUserInput = z.infer<typeof createUserSchema>;
   ```

2. **Export from `common/src/index.ts`**:
   ```typescript
   export { createUserSchema, type CreateUserInput } from './schemas/user';
   ```

3. **Add dependency** to backend/frontend `package.json`:
   ```json
   {
     "dependencies": {
       "@helpdesk/common": "*"
     }
   }
   ```

4. **Import in frontend/backend**:
   ```typescript
   // Frontend (React Hook Form)
   import { createUserSchema, type CreateUserInput } from '@helpdesk/common';
   import { Role } from '@/lib/role';

   const { register, handleSubmit } = useForm<CreateUserInput>({
     resolver: zodResolver(createUserSchema),
   });

   // Backend (Express route validation)
   import { createUserSchema } from '@helpdesk/common';

   router.post('/users', async (req, res) => {
     const result = createUserSchema.safeParse(req.body);
     if (!result.success) {
       return res.status(400).json({ error: result.error.issues[0]?.message });
     }
   });
   ```

### Query Parameter Schemas

Query parameter schemas (like pagination, filtering, sorting) should also be in `common/`:

```typescript
// common/src/schemas/ticket.ts
import { z } from 'zod';

export const VALID_SORT_COLUMNS = ['id', 'subject', 'createdAt'] as const;
export type SortColumn = typeof VALID_SORT_COLUMNS[number];
export type SortOrder = 'asc' | 'desc';

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  sortBy: z.enum(VALID_SORT_COLUMNS).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
```

Frontend can use the inferred type directly:
```typescript
// frontend/src/lib/api.ts
import { listTicketsQuerySchema } from '@helpdesk/common';

export type TicketQueryParams = z.infer<typeof listTicketsQuerySchema>;
```

### Benefits
- **Single source of truth** - Validation logic defined once
- **Type safety** - Shared types inferred from schemas
- **Consistency** - Frontend and backend use identical validation rules
- **Maintainability** - Changes to validation propagate to both ends
- **No duplication** - Eliminates redundant type definitions

### Files Reference

| File | Purpose |
|------|---------|
| `common/src/index.ts` | Package entry point |
| `common/src/schemas/user.ts` | User-related schemas |
| `common/src/schemas/ticket.ts` | Ticket schemas, enums, query schemas |
| `common/package.json` | Package configuration |

## Form Handling (React Hook Form + Zod)

### Overview
Forms use **React Hook Form** with **Zod** validation via `@hookform/resolvers`. This provides type-safe form validation with minimal re-renders.

### Usage Pattern

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, type CreateUserInput } from '@helpdesk/common';

// Use in component
export function CreateUserModal({ open, onOpenChange, onSubmit }: CreateUserModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'AGENT',
    },
  });

  const handleFormSubmit = async (data: CreateUserInput) => {
    await onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <Input {...register('name')} placeholder="Name" />
      {errors.name && <p>{errors.name.message}</p>}
      
      <Input {...register('email')} type="email" placeholder="Email" />
      {errors.email && <p>{errors.email.message}</p>}
      
      <Input {...register('password')} type="password" placeholder="Password" />
      {errors.password && <p>{errors.password.message}</p>}
      
      <Select value={watch('role')} onValueChange={(v) => setValue('role', v)}>
        <SelectItem value="AGENT">Agent</SelectItem>
        <SelectItem value="ADMIN">Admin</SelectItem>
      </Select>
      {errors.role && <p>{errors.role.message}</p>}
      
      <Button type="submit" disabled={isSubmitting}>Create</Button>
    </form>
  );
}
```

### Key Hooks

| Hook | Purpose |
|------|---------|
| `register` | Register input/select fields with form |
| `handleSubmit` | Wrap submit handler with validation |
| `setValue` | Programmatically set field value (for Select) |
| `watch` | Watch field values (for controlled Select) |
| `reset` | Reset form to default values |
| `formState` | Access errors, isSubmitting, etc. |

### Error Display

#### Form Field Errors

Use the reusable `FormFieldError` component to display form field errors consistently:

```typescript
import { FormFieldError } from '@/components/ui/form-field-error';

// Use in form components
<div>
  <Input {...register('name')} placeholder="Name" />
  <FormFieldError error={errors.name} />
</div>
```

The component:
- Accepts an optional `error` prop of type `FieldError` from react-hook-form
- Renders nothing if no error is present
- Displays error message with consistent styling (`text-sm text-destructive mt-1`)

**Do NOT** duplicate form field error markup. Always use `FormFieldError` for consistency.

#### General Error Messages

Use the `ErrorMessage` component for non-form errors (API failures, load errors, etc.):

```typescript
import { ErrorMessage } from '@/components/ui/error-message';

// Load error
<ErrorMessage message="Failed to load data. Please try again." />

// Mutation failure with custom styling
<ErrorMessage message="Failed to update" className="text-xs mt-1" />
```

The component:
- Accepts `message` (required) and `className` (optional) props
- Includes an alert icon for visual consistency
- Used for mutation errors, load failures, and other error states

**Do NOT** duplicate general error message markup. Always use `ErrorMessage` for consistency.

### Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/components/ui/form-field-error.tsx` | Reusable form field error display component |
| `frontend/src/components/ui/error-message.tsx` | Reusable general error message component |
| `frontend/src/components/UserFormModal.tsx` | Example form with FormFieldError |
| `frontend/src/components/ReplyForm.tsx` | Example form with FormFieldError |
| `frontend/src/pages/TicketDetailPage.tsx` | Example with ErrorMessage for load/mutation errors |
| `frontend/src/pages/TicketsPage.tsx` | Example with ErrorMessage for load errors |

## Backend Validation (Zod)

### Overview
Backend request validation uses **Zod** for schema validation on API endpoints. Schemas are imported from `@helpdesk/common` for consistency with frontend forms.

**Rule:** All Zod schemas must be defined in `common/src/schemas/`. Do NOT define schemas locally in backend route files. See [Shared Code (Common Package)](#shared-code-common-package) for details.

### Usage Pattern

```typescript
import { createUserSchema } from '@helpdesk/common';

// Validate in route handler
router.post('/users', async (req, res) => {
  const validationResult = createUserSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    const errorMessage = validationResult.error.issues[0]?.message || 'Invalid request data';
    return res.status(400).json({ error: errorMessage });
  }

  const { name, email, password, role } = validationResult.data;
  // ... proceed with valid data
});
```

### Common Validations

| Validation | Zod Syntax |
|------------|------------|
| Required string | `z.string()` |
| Min length | `z.string().min(3, 'Message')` |
| Email format | `z.string().email('Message')` |
| Enum value | `z.enum(['A', 'B'])` |
| Number range | `z.number().min(1).max(100)` |

### Files Reference

| File | Purpose |
|------|---------|
| `backend/src/routes/admin.ts` | Admin routes with Zod validation (imports from @helpdesk/common) |
| `backend/src/routes/tickets.ts` | Ticket routes with Zod validation (imports from @helpdesk/common) |
| `common/src/schemas/` | Shared Zod schemas (single source of truth) |

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

### E2E Testing Guidelines

**Rule: Write only E2E tests that cannot be covered by unit tests.**

E2E tests should focus on integration-level flows that unit tests cannot verify:
- **Navigation flows** — Multi-page journeys (e.g., list → detail → back)
- **End-to-end user actions** — Form submission → API call → UI update → data persists
- **Cross-component integration** — Multiple components working together on a page
- **Authentication gates** — Redirects, session handling, role-based page access
- **Real browser behavior** — URL changes, cookie handling, redirects

**Do NOT write E2E tests for:**
- Component rendering (covered by unit tests)
- Individual component behavior (dropdowns, forms, buttons — use unit tests)
- Validation logic (use unit tests with Zod schema)
- Loading/error states (covered by unit tests)
- Anything that can be tested in isolation with `@testing-library/react`

**E2E test structure:**
- Group tests by page/feature: `test.describe('Ticket Detail Page - Navigation', ...)`
- Use helper functions for auth, data creation, and common actions
- Create test data via backend API in `test.beforeAll` or within tests
- Use resilient selectors: `getByRole`, `getByLabel`, `getByText`
- Verify end states, not intermediate steps

### Using the playwright-e2e-tester Agent

When implementing new features, user flows, or pages that require automated testing, use the **playwright-e2e-tester** agent to write E2E tests.

**When to trigger the agent:**
- After implementing new features or user flows
- When adding test coverage for critical user journeys
- When existing tests need updating due to UI changes
- When implementing authentication/authorization flows
- When adding form validations or error handling tests

**How to use:**
```
Use the agent tool with subagent_type: "playwright-e2e-tester"
Provide a clear description of what needs to be tested
Include any specific scenarios or edge cases to cover
```

The agent will:
- Write production-ready Playwright tests following best practices
- Use resilient selectors (getByRole, getByLabel, getByTestId)
- Cover happy paths and edge cases
- Provide instructions for running the tests

## API & Data Fetching

### Axios Configuration

API calls use **Axios** with a pre-configured instance for consistent settings:

```typescript
// src/lib/api.ts
import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies for auth
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Guidelines:**
- Use the `api` instance for all backend requests
- `withCredentials: true` ensures session cookies are included
- Handle errors at the query/mutation level (TanStack Query)

### TanStack Query (React Query)

Data fetching uses **TanStack Query v5** for caching, background updates, and loading states:

```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});
```

**Guidelines:**
- Use `useQuery` for data fetching in components
- Query keys should be arrays: `['resource', id]` for detail queries
- Let TanStack Query handle loading/error states
- Default stale time: 5 minutes (configured in `QueryProvider`)

### useMutation for Data Mutations

Use `useMutation` for POST, PUT, DELETE operations:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser } from '@/lib/api';

const queryClient = useQueryClient();

const createMutation = useMutation({
  mutationFn: createUser,
  onSuccess: () => {
    // Invalidate and refetch queries
    queryClient.invalidateQueries({ queryKey: ['users'] });
    // Close modal or reset form
    setIsModalOpen(false);
  },
});

// Use in component
const handleCreateUser = async (data: CreateUserInput) => {
  await createMutation.mutateAsync(data);
};

// Access mutation state
const { isPending, isError, error, data } = createMutation;
```

### Example API Layer Pattern

```typescript
// src/lib/api.ts
export interface User { /* ... */ }

export async function fetchUsers(): Promise<User[]> {
  const response = await api.get<User[]>('/api/admin/users');
  return response.data;
}

export async function createUser(data: CreateUserInput): Promise<User> {
  const response = await api.post<User>('/api/admin/users', data);
  return response.data;
}
```

```typescript
// src/pages/UsersPage.tsx
// Query
const { data: users = [], isLoading, error } = useQuery<User[]>({
  queryKey: ['users'],
  queryFn: fetchUsers,
});

// Mutation
const createMutation = useMutation({
  mutationFn: createUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});
```

## Component Testing

### Using the react-component-tester Agent

When implementing new React components, pages, or features that require test validation, use the **react-component-tester** agent to write component tests.

**When to trigger the agent:**
- After creating a new React component or page
- When adding test coverage to existing components
- When refactoring components and need to update tests
- When implementing new features that require test validation
- When adding form validations or error handling tests

**How to use:**
```
Use the agent tool with subagent_type: "react-component-tester"
Provide a clear description of what needs to be tested
Include any specific scenarios or edge cases to cover
```

The agent will:
- Write production-ready Vitest tests using React Testing Library
- Use resilient queries (getByRole, getByLabel, getByTestId)
- Cover happy paths and edge cases
- Mock API calls with MSW for TanStack Query tests
- Provide instructions for running the tests

### Overview
Component tests use **Vitest** with **React Testing Library** and **MSW** for API mocking.

### Test Commands

| Command | Description |
|---------|-------------|
| `bun run test` | Run tests in watch mode |
| `bun run test:run` | Run tests once (CI mode) |
| `bun run test:ui` | Open Vitest UI dashboard |

### Test File Location
Place test files next to the components they test:
- `src/pages/UsersPage.test.tsx`
- `src/components/NavBar.test.tsx`

### Test Setup Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vitest configuration (jsdom environment) |
| `src/test/setup.ts` | Global test setup (jest-dom matchers) |
| `src/test/test-utils.tsx` | Custom render with providers |

### Writing Tests

#### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render } from '@/test/test-utils';
import { YourComponent } from './YourComponent';

// Mock data
const mockData = { /* ... */ };

// Setup MSW server
const server = setupServer(
  http.get('/api/endpoint', () => HttpResponse.json(mockData))
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('YourComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(<YourComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });
});
```

#### Testing with TanStack Query

```typescript
it('displays data after fetch', async () => {
  render(<YourComponent />);
  
  // Initial loading state
  expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  
  // Wait for data
  await waitFor(() => {
    expect(screen.getByText('Loaded Data')).toBeInTheDocument();
  });
});
```

#### Testing Error States

```typescript
it('displays error message', async () => {
  server.use(
    http.get('/api/endpoint', () => 
      new HttpResponse(null, { status: 500 })
    )
  );
  
  render(<YourComponent />);
  
  await waitFor(() => {
    expect(screen.getByText(/Request failed with status code 500/))
      .toBeInTheDocument();
  });
});
```

#### Testing Empty States

```typescript
it('displays empty state', async () => {
  server.use(
    http.get('/api/endpoint', () => HttpResponse.json([]))
  );
  
  render(<YourComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });
});
```

### Best Practices

1. **Use `waitFor` for async operations** - TanStack Query updates are async
2. **Mock all API calls with MSW** - Don't rely on real backend
3. **Test user-facing text** - Use `getByText`, `getByRole` over testids
4. **Test loading, error, and empty states** - Cover all UI states
5. **Use `within()` for scoped queries** - Avoid finding duplicate elements
6. **Reset handlers between tests** - Use `server.resetHandlers()` in `afterEach`
7. **Use `vi.clearAllMocks()` in `beforeEach`** - Clean state for each test

### Example: Testing a Table Component

```typescript
import { within } from '@testing-library/react';

it('renders table with correct data', async () => {
  render(<UsersPage />);
  
  await waitFor(() => {
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows.length).toBe(4); // header + 3 data rows
  });
});
```

## Ticket System & Email Integration

### Overview
The system automatically receives emails at a support address and converts them into tickets. It supports **two email ingestion methods** through a unified interface:

1. **IMAP Polling** — Periodically checks an IMAP mailbox for new emails
2. **Webhook** — Accepts HTTP POST from email providers (Mailgun, SendGrid, SES, etc.)

Both methods use the same core ingestion logic, ensuring consistent ticket creation and reply threading.

### Database Models

#### Ticket Model
```prisma
enum TicketStatus {
  OPEN
  RESOLVED
  CLOSED
}

enum TicketCategory {
  GENERAL_QUESTION
  TECHNICAL_QUESTION
  REFUND_REQUEST
}

model Ticket {
  id          BigInt          @id @default(autoincrement())
  subject     String
  description String          @db.Text
  status      TicketStatus    @default(OPEN)
  category    TicketCategory?
  emailFrom   String
  senderName  String
  emailTo     String
  assignedTo  User?           @relation("AssignedTickets", fields: [assignedToId], references: [id])
  assignedToId String?
  messages    TicketMessage[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([status])
  @@index([assignedToId])
  @@index([emailFrom])
  @@index([createdAt(sort: Desc)])
}
```

**Key Fields:**
- `id` — Auto-incrementing BigInt for human-readable ticket numbers (e.g., #1, #2, #3)
- `senderName` — **Required** display name of the email sender (extracted from email headers)
- `emailFrom` — Sender email address
- `description` — Original email body (plain text)

#### TicketMessage Model
Stores individual emails in the ticket thread:
```prisma
model TicketMessage {
  id        String   @id @default(cuid())
  ticketId  BigInt
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  from      String
  to        String
  subject   String
  body      String   @db.Text
  bodyHtml  String?  @db.Text
  headers   Json?
  createdAt DateTime @default(now())

  @@index([ticketId])
  @@index([createdAt(sort: Desc)])
}
```

**Key Fields:**
- `body` — **Required** plain text version of the email/message content
- `bodyHtml` — **Optional** rich HTML version of the email (for rendering in email viewers)
- `headers` — **Optional** JSON object storing email threading metadata:
  ```json
  {
    "messageId": "<CABc123xyz@mail.gmail.com>",
    "inReplyTo": "<CADef456abc@mail.gmail.com>",
    "references": ["<CABc123xyz@mail.gmail.com>", "<CADef456abc@mail.gmail.com>"]
  }
  ```
  Used for:
  - **Reply threading** — Links replies to the correct ticket via `In-Reply-To` and `References`
  - **Deduplication** — Prevents processing the same email twice via `Message-ID`
  - **Email forensics** — Preserves original email metadata

### Email Ingestion Architecture

```
Email Provider (IMAP/Webhook)
         ↓
  Email Parser (nodemailer/mailparser)
         ↓
  Email Ingestor (processIncomingEmail)
         ↓
  Ticket Service (create/append)
         ↓
  Database (Prisma)
```

**Key Files:**

| File | Purpose |
|------|---------|
| `backend/src/services/emailIngestor.ts` | Core ingestion logic (parse → deduplicate → create/append) |
| `backend/src/services/ticketService.ts` | Ticket CRUD operations |
| `backend/src/services/emailProviders/imapProvider.ts` | IMAP polling implementation |
| `backend/src/services/emailProviders/webhookProvider.ts` | Webhook endpoint handler |
| `backend/src/lib/emailParser.ts` | Raw email → structured data |
| `backend/src/routes/tickets.ts` | Ticket API endpoints |

### Configuration

Add to `.env`:

```env
# Email Provider Selection
# Options: "imap", "webhook", "both", "none" (default: "none")
EMAIL_PROVIDER=imap

# IMAP Configuration (for polling)
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=support@yourdomain.com
IMAP_PASSWORD=your_app_password
IMAP_TLS=true
IMAP_MAILBOX=INBOX
EMAIL_POLLING_INTERVAL=30000  # milliseconds

# Webhook Configuration (for provider callbacks)
WEBHOOK_SECRET=your_webhook_secret  # For signature validation
```

### How It Works

#### 1. Email Reception
- **IMAP Mode**: Polls mailbox every N seconds, fetches unseen emails
- **Webhook Mode**: Listens for POST at `/api/email/webhook`

#### 2. Email Parsing
Uses `nodemailer`'s `simpleParser` to extract:
- From, To, Subject
- Body (text/plain and text/html)
- Headers (Message-ID, In-Reply-To, References)

#### 3. Deduplication
Checks `Message-ID` header against existing ticket messages to avoid processing the same email twice.

#### 4. Reply Threading
- Checks `In-Reply-To` and `References` headers
- If match found → appends message to existing ticket
- If no match → creates new ticket

#### 5. Ticket Creation
Creates ticket with:
- `status: OPEN`
- `category: null` (to be classified by AI in Phase 5)
- Initial message from the email

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/tickets` | Required | List tickets (paginated, filterable) |
| `GET` | `/api/tickets/:id` | Required | Get ticket with message thread |
| `POST` | `/api/tickets` | Required | Create ticket manually |
| `PUT` | `/api/tickets/:id` | Required | Update ticket (status, category, assignee) |
| `POST` | `/api/tickets/:id/messages` | Required | Add message to ticket |
| `POST` | `/api/email/webhook` | Signature | Webhook for email providers |

#### Query Parameters for GET /api/tickets
```
?page=1&limit=20&status=OPEN&category=TECHNICAL_QUESTION&assignedToId=user123
```

### Using the Ticket Service

```typescript
import {
  createTicket,
  getTicketById,
  listTickets,
  updateTicket,
  addMessage,
} from '@/services/ticketService';

// Create a ticket
const ticket = await createTicket({
  subject: 'Need help with login',
  description: 'I can\'t access my account...',
  emailFrom: 'user@example.com',
  emailTo: 'support@helpdesk.com',
});

// Update ticket status
await updateTicket(ticket.id, {
  status: 'RESOLVED',
  category: 'TECHNICAL_QUESTION',
});

// Add message to thread
await addMessage(ticket.id, {
  from: 'agent@helpdesk.com',
  to: 'user@example.com',
  subject: 'Re: Need help with login',
  body: 'We\'ve reset your password...',
});
```

### Supported Webhook Providers

The webhook handler automatically detects payload format from:

| Provider | Format | Notes |
|----------|--------|-------|
| **Mailgun** | Multipart or parsed JSON | Uses `body-mime` or `body-plain` fields |
| **SendGrid** | Inbound parse webhook | Uses `from`, `to`, `subject`, `text` fields |
| **AWS SES** | SNS notification | Requires SNS topic configuration |
| **Generic** | Custom JSON | Provide `from`, `to`, `subject`, `body` fields |

### Graceful Shutdown
On `SIGINT` or `SIGTERM`:
1. Stops IMAP polling
2. Ends IMAP connection
3. Disconnects from database
4. Exits process

### Adding New Email Providers

To add a new email provider:

1. Create a new file in `backend/src/services/emailProviders/`
2. Implement the provider logic (follow IMAP or webhook pattern)
3. Export initialization function
4. Call it in `backend/src/index.ts` based on `EMAIL_PROVIDER` env var

The unified ingestion interface (`emailIngestor.ts`) means you don't need to change core logic.

### Testing Email Integration

#### Testing Webhook
```bash
curl -X POST http://localhost:3001/api/email/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "user@example.com",
    "to": "support@helpdesk.com",
    "subject": "Test ticket",
    "body": "This is a test email",
    "bodyHtml": "<p>This is a test email</p>"
  }'
```

#### Testing with Raw MIME Email
```bash
curl -X POST http://localhost:3001/api/email/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "raw": "From: user@example.com\r\nTo: support@helpdesk.com\r\nSubject: Test\r\n\r\nTest body"
  }'
```

### Shared Schemas

Ticket validation schemas are in `@helpdesk/common`:

```typescript
import {
  createTicketSchema,
  updateTicketSchema,
  createMessageSchema,
  TicketStatus,
  TicketCategory,
  type CreateTicketInput,
  type UpdateTicketInput,
  type CreateMessageInput,
} from '@helpdesk/common';
```

Use these in both frontend (form validation) and backend (request validation).
