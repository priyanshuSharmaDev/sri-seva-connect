# Production Deployment Runbook

## Current release topology

Deploy three independently managed concerns:

1. **API container** — the `runtime` target from the root `Dockerfile`.
2. **Migration job** — the `migrate` target, run once before each API release.
3. **Managed PostgreSQL 17** — private networking, TLS, automated backups, and
   point-in-time recovery enabled.

Do not run `prisma migrate dev` in production. Production releases use
`npm run db:deploy` as a release job before replacing API instances.

## Required production configuration

Copy `.env.production.example` into the selected host's secret manager. Never
commit the resulting values.

Required secrets:

- `DATABASE_URL` — PostgreSQL connection URL with TLS required.
- `JWT_SECRET` — at least 32 cryptographically random characters, unique to the
  environment.

Generate a suitable secret locally:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Operational settings:

- `TRUST_PROXY=true` when the API runs behind a managed load balancer.
- `CORS_ORIGINS` is a comma-separated allow-list. Native mobile requests do not
  require browser CORS; add only real web administration origins.
- Keep access tokens short-lived. Refresh tokens rotate on every refresh and are
  stored only as hashes by the API.

## First database deployment

Create an empty PostgreSQL database and set `DATABASE_URL`, then run:

```powershell
npm ci
npm run db:generate
npm run db:deploy
npm run db:status
```

Use `npm run db:seed` only in local/demo environments. Production organizations
and initial administrators need a dedicated bootstrap process before launch;
never deploy the documented demo credentials.

## Local container validation

Create a local `.env` from `.env.example`, replace `JWT_SECRET`, and run:

```powershell
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose up -d api
docker compose ps
```

Expected endpoints:

- `GET /health/live` confirms that the Node process is alive.
- `GET /health/ready` confirms PostgreSQL connectivity.
- `GET /` returns non-sensitive service metadata.

## Release order

1. Back up the production database and verify the latest automated backup.
2. Build the immutable image from a reviewed commit.
3. Run CI type checks, tests, lint, Android bundle export, and dependency audit.
4. Run the migration job against production.
5. Confirm `npm run db:status` reports no pending migrations.
6. Roll out the API container with readiness checks.
7. Exercise login, customer access isolation, customer transfer, and dashboard
   smoke tests.
8. Roll back the API image if needed. Prefer a forward database fix; Prisma
   migrations are not automatically reversed.

## Backups and recovery

- Enable daily backups and at least seven days of point-in-time recovery before
  onboarding real customers.
- Keep backups in a different failure domain from the primary database.
- Run a restore drill into a disposable database before launch and quarterly
  thereafter.
- Document recovery time and recovery point objectives with the business owner.
- Encrypt backups and restrict restore privileges to production administrators.

## Monitoring and alerts

At minimum collect:

- API request rate, latency, status codes, and process restarts;
- `/health/ready` failures;
- PostgreSQL connections, storage, CPU, slow queries, and replication/backup
  health;
- login throttling and failed authentication volume;
- scheduler lag, reminder delivery failures, duplicate suppression, and device
  sync age once reminder workers are enabled.

Logs already carry request IDs and redact authorization headers/passwords. Do
not add customer names, phone numbers, notes, tokens, or occasion details to
application logs.

## Mobile release prerequisites

Before an Android production release:

- replace mobile fixture data with authenticated API and SQLite repositories;
- configure the production `EXPO_PUBLIC_API_URL` using HTTPS;
- implement secure token storage, notification permissions, local notification
  reconciliation, and push token registration;
- configure Android application signing and store credentials outside Git;
- publish a privacy policy and data-deletion process;
- complete physical-device tests for offline behavior, quiet hours, timezone
  changes, transfers, and denied notification permissions.

## Current launch blockers

The repository can be deployed as an API/database foundation, but the complete
CRM is not ready for real customer data until these are implemented:

- API-backed mobile authentication and secure token storage;
- SQLite offline synchronization and access-revocation purge;
- customer/family/occasion forms backed by the API;
- reminder scheduler, push dispatcher, and local notification reconciliation;
- communication history and follow-up APIs;
- end-to-end authorization and transfer tests against PostgreSQL;
- production administrator bootstrap and password recovery;
- privacy, retention, incident response, and support procedures.
