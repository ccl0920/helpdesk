# Helpdesk - AI-Powered Ticket Management System

A full-stack ticket management system built with Express, React, TypeScript, and Bun.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS + React Router |
| **Backend** | Node.js + Express + TypeScript |
| **Runtime** | Bun |
| **Database** | PostgreSQL (with Prisma ORM) |
| **AI** | Puter.js |
| **Deployment** | Docker |

## Project Structure

```
helpdesk/
├── backend/              # Express API server
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   └── index.ts      # Entry point
│   ├── prisma/           # Prisma schema & migrations
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

## Getting Started

### Prerequisites

- Bun (install with: `curl -fsSL https://bun.sh/install | bash`)
- PostgreSQL (for database)

### Installation

```bash
# Install all dependencies
bun run install:all
```

### Development

```bash
# Run both frontend and backend concurrently
bun run dev

# Or run separately
bun run dev:backend    # Backend on http://localhost:3001
bun run dev:frontend   # Frontend on http://localhost:5173
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api` | API info |

## Features (Planned)

- [ ] User authentication with database sessions
- [ ] Admin can create/manage agents
- [ ] Ticket CRUD operations
- [ ] AI-powered ticket classification
- [ ] AI-suggested replies
- [ ] Email integration (incoming/outgoing)
- [ ] Knowledge base for AI responses
- [ ] Dashboard with analytics

## License

MIT
