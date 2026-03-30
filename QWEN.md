# Project Context: Helpdesk - AI-Powered Ticket Management System

## Project Overview

A full-stack ticket management system that uses AI to automatically classify, respond to, and route support tickets. Built with Express, React, TypeScript, and Bun.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS + React Router |
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
```

## Current Phase: Phase 1 (Setup & Infrastructure)

### Completed
- [x] Initialize monorepo structure (frontend/, backend/)
- [x] Set up backend: Node.js + Express + TypeScript
- [x] Set up frontend: React + TypeScript
- [x] Frontend health check API call
- [x] Set up Prisma ORM with PostgreSQL
- [x] Configure DATABASE_URL for helpdesk database
- [x] Generate Prisma client
- [x] Verify full stack runs locally

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
| **Admin** | Create/manage agents, view all tickets, full system access |
| **Agent** | View and respond to tickets, update ticket status/category |

## Notes

- Always use Context7 to fetch up-to-date documentation before implementing new features
- Keep code TypeScript strict mode compliant
- Follow existing project conventions for imports, naming, and structure
- Always use `prisma migrate dev` for development, never `prisma db push`
