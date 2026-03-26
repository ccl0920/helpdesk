# Tech Stack

## Frontend

| Layer | Technology |
|-------|------------|
| Framework | **React 19** with **TypeScript** |
| Build Tool | **Vite** |
| Styling | **Tailwind CSS** |
| Routing | **React Router v7** |
| State Management | **React Query** (server state) + **Zustand** (client state) |
| UI Components | **shadcn/ui** (optional) |

---

## Backend

| Layer | Technology |
|-------|------------|
| Runtime | **Node.js 20+** |
| Framework | **Express** |
| Language | **TypeScript** |
| Authentication | **Database sessions** (session stored in DB, session ID in cookie) |

---

## Database

| Layer | Technology |
|-------|------------|
| Database | **PostgreSQL** |
| ORM | **Prisma** |

---

## AI Integration

| Layer | Technology |
|-------|------------|
| AI Library | **Puter.js** |
| Provider | Puter AI (via Puter cloud) |

---

## Email Integration

| Layer | Technology |
|-------|------------|
| Incoming | *TBD* (IMAP polling or email forwarding) |
| Outgoing | *TBD* (SendGrid, Resend, or AWS SES) |

---

## Deployment

| Layer | Technology |
|-------|------------|
| Containerization | **Docker** + **Docker Compose** |
| Hosting | *TBD* (any Docker-compatible host: Railway, Render, Fly.io, VPS) |

---

## Development Tools

| Purpose | Technology |
|---------|------------|
| Linting | **ESLint** + **Prettier** |
| Testing | **Vitest** (frontend) + **Jest** or **Vitest** (backend) |
| API Testing | **Postman** or **Insomnia** |
| Database GUI | **pgAdmin** or **TablePlus** |

---

## Project Structure

```
helpdesk/
├── frontend/           # React + TypeScript app
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── backend/            # Express + TypeScript API
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml  # Orchestrates frontend, backend, PostgreSQL
└── README.md
```

---

## Authentication Flow

1. User (admin/agent) logs in with credentials
2. Backend validates credentials against database
3. Backend creates a session record in the `sessions` table
4. Session ID is sent to client as an **HTTP-only cookie**
5. Client includes cookie on subsequent requests
6. Backend middleware validates session and attaches user to request
7. On logout, session is deleted from database

### Session Table Schema (example)

```prisma
model Session {
  id        String   @id @default(cuid())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```
