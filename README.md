# Sri Seva Connect

Mobile-first relationship CRM for managers to remember customer and family
occasions, make personal contact, and record thoughtful follow-ups.

## Current foundation

- Expo 57 / React Native Android-first application
- Node.js 22+ / Express 5 API
- PostgreSQL 17 / Prisma 7 data layer
- Tenant, role, ownership, sharing, and transfer boundaries
- Customer, family, occasion, reminder, communication, and sync models
- Shared Zod contracts and pure reminder/date domain functions
- Docker-based local PostgreSQL

The mobile screens currently use representative local data while the API and
SQLite sync layer are connected in subsequent slices. Campaign features remain
outside the primary experience.

## Prerequisites

- Node.js 22 or later
- npm 11 or later
- Docker Desktop
- Android Studio/emulator or an Android device with Expo Go

## Setup

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d postgres
npm run db:generate
docker compose --profile tools run --rm migrate
npm run db:seed
```

Demo accounts use password `Welcome123!`:

- `admin@sriseva.local`
- `manager@sriseva.local`

Do not use demo credentials outside local development.

## Run

In separate terminals:

```powershell
npm run dev:api
npm run dev:mobile
```

The API defaults to `http://localhost:4000`. Use the development machine's LAN
address instead of `localhost` when connecting from a physical Android device.

## Quality checks

```powershell
npm run typecheck
npm test
npm run build --workspace @ssc/api
```

See [architecture](docs/ARCHITECTURE.md) and the
[implementation plan](docs/IMPLEMENTATION_PLAN.md) for domain and delivery
decisions.

Production operators should follow the
[deployment runbook](docs/PRODUCTION_DEPLOYMENT.md). The API container, migration
job, CI checks, environment template, readiness probe, and database constraints
are checked into this repository.
