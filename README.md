# Travel Agency Management System

Phase 1 sets up the production-oriented foundation for a Travel Agency Management System using React, Node.js, Express, PostgreSQL, Prisma, Tailwind CSS, JWT-ready server configuration, Zod validation, and npm workspaces.

This phase intentionally includes no business logic. It focuses on repository structure, tooling, environment management, build scripts, quality checks, and a minimal health-check API.

## Tech Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Authentication Foundation: JWT package installed for future phases
- Validation: Zod
- Package Manager: npm

## Project Structure

```text
.
|-- backend/
|   |-- src/
|   |   |-- app/
|   |   |-- common/
|   |   |-- config/
|   |   |-- lib/
|   |   |-- middlewares/
|   |   |-- modules/
|   |   `-- routes/
|   |-- tests/
|   |-- .env.example
|   |-- eslint.config.js
|   |-- package.json
|   |-- tsconfig.build.json
|   `-- tsconfig.json
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- app/
|   |   |-- components/
|   |   |-- features/
|   |   |-- hooks/
|   |   |-- lib/
|   |   |-- pages/
|   |   |-- routes/
|   |   |-- stores/
|   |   |-- styles/
|   |   |-- test/
|   |   `-- types/
|   |-- .env.example
|   |-- eslint.config.js
|   |-- package.json
|   |-- postcss.config.js
|   |-- tailwind.config.js
|   |-- tsconfig.json
|   |-- vite.config.ts
|   `-- vitest.config.ts
|-- prisma/
|   `-- schema.prisma
|-- scripts/
|-- shared/
|   `-- types/
|-- .env.example
|-- .gitignore
|-- .prettierignore
|-- .prettierrc.json
|-- package.json
`-- tsconfig.base.json
```

## Prerequisites

- Node.js 22+
- npm 11+
- PostgreSQL 15+

## Environment Setup

The repository includes local development `.env` files and matching `.env.example` files.

Update these files before running database operations in a real environment:

- Root `.env`: Prisma database connection
- `backend/.env`: API port, JWT secret, client URL, and database connection
- `frontend/.env`: client app name and API base URL

## Installation

```bash
npm install
```

The root `postinstall` script generates the Prisma client automatically.

## Available Scripts

### Root

- `npm run dev`: start frontend and backend together
- `npm run dev:frontend`: start only the frontend
- `npm run dev:backend`: start only the backend
- `npm run build`: build frontend and backend for production
- `npm run start`: run the compiled backend server
- `npm run lint`: run ESLint in both workspaces
- `npm run check`: run TypeScript checks in both workspaces
- `npm run test`: run frontend and backend tests
- `npm run format`: format the repository with Prettier
- `npm run format:check`: validate formatting
- `npm run prisma:validate`: validate Prisma schema
- `npm run prisma:generate`: generate Prisma client
- `npm run prisma:migrate:dev`: run development migrations
- `npm run prisma:studio`: open Prisma Studio

### Frontend

- `npm run dev --workspace frontend`
- `npm run build --workspace frontend`
- `npm run preview --workspace frontend`
- `npm run lint --workspace frontend`
- `npm run check --workspace frontend`
- `npm run test --workspace frontend`

### Backend

- `npm run dev --workspace backend`
- `npm run build --workspace backend`
- `npm run start --workspace backend`
- `npm run lint --workspace backend`
- `npm run check --workspace backend`
- `npm run test --workspace backend`

## Local Development Flow

1. Ensure PostgreSQL is running.
2. Update `.env`, `backend/.env`, and `frontend/.env` if needed.
3. Install dependencies:

```bash
npm install
```

4. Validate Prisma configuration:

```bash
npm run prisma:validate
```

5. Start both applications:

```bash
npm run dev
```

6. Open the frontend in the browser at `http://localhost:5173`.
7. Check the backend health endpoint at `http://localhost:4000/api/v1/health`.

## Production Build

```bash
npm run build
npm run start
```

The frontend is built into `frontend/dist`, and the backend compiles into `backend/dist`.

## Phase 1 Verification

The following checks have been prepared as first-class scripts:

```bash
npm run check
npm run lint
npm run test
npm run prisma:validate
npm run prisma:generate
npm run build
```
