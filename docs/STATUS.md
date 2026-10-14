# Implementation Status

Updated: 12 October 2026

## Completed foundation

- npm-workspaces monorepo with mobile, API, contracts, and domain packages.
- Expo 57 Android-first mobile shell with Today, Customers, Activity, customer
  detail, quick call, WhatsApp, and SMS actions.
- Express 5 API with validated environment, security headers, structured logging,
  request IDs, error envelopes, and health endpoints.
- Prisma 7 PostgreSQL schema and checked-in initial migration for organizations,
  managers, ownership/sharing, customers, family, occasions, reminders,
  communications, devices, sync changes, audit events, and domain outbox.
- Login/access token foundation with hashed, expiring refresh sessions.
- Tenant/assignment/share-scoped customer reads and writes.
- Customer, family-member, and occasion create/detail APIs.
- Super Admin transactional customer transfer with pending reminder reassignment.
- Restricted memorial filtering for shared managers.
- Shared validation contracts and pure leap-year, phone, and reminder-dedupe rules.
- Docker Compose PostgreSQL definition and local seed users.
- Production API and migration container targets, database readiness probes,
  rotating refresh sessions, authentication throttling, and CI verification.
- PostgreSQL domain constraints and a production deployment/backup runbook.

## Validated

- All workspace TypeScript checks pass.
- API production bundle builds and starts.
- Android Expo production bundle exports successfully.
- Mobile ESLint passes.
- Seven automated domain and authorization assertions pass.
- Prisma schema validates and initial PostgreSQL migration SQL is generated.

## Current limitations

- Mobile screens use representative local data; API login/data fetching and
  SQLite synchronization are the next vertical slice.
- Reminder outbox and persistence exist, but the scheduler/dispatcher worker and
  Expo push/local notification integration are not implemented yet.
- Docker Desktop 4.91 is installed, but its Linux engine did not expose the
  Docker API after startup. Its window was opened for the required interactive
  first-run, WSL, terms, update, or restart action. Until that is completed, the
  generated migrations cannot be applied to the local PostgreSQL container.
- npm audit currently reports advisories in current Expo/React Native build-tool
  dependencies and Prisma CLI dependencies. Its proposed fixes are incompatible
  major downgrades, so no forced downgrade was applied.

## Next slice

1. Connect mobile authentication and secure token storage.
2. Add SQLite repositories, local mutation outbox, and first sync pull/push.
3. Replace dashboard/customer fixtures with API-backed cached data.
4. Add customer/family/occasion create and edit forms.
5. Implement occurrence generation, reminder worker, local notifications, and
   server push reconciliation.
