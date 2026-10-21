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

- `DATABASE_URL` — pooled PostgreSQL connection URL with TLS required, used by
  normal API traffic.
- `DATABASE_URL_UNPOOLED` — direct PostgreSQL connection URL with TLS required,
  used only by Prisma migrations and administrative operations.
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
and initial administrators must use the dedicated bootstrap command below;
never deploy the documented demo credentials.

### Bootstrap the first Super Admin

Run this only from a trusted local terminal whose `.env` points at the intended
production Neon branch. The password prompt is masked and the plaintext value
exists only in the current PowerShell process:

```powershell
$adminPassword = Read-Host "Choose a Super Admin password (12+ characters)" -AsSecureString
$adminCredential = [System.Management.Automation.PSCredential]::new("unused", $adminPassword)
$env:SUPER_ADMIN_EMAIL = "prabaladasa.bvks@gmail.com"
$env:SUPER_ADMIN_FULL_NAME = "Prabala Dasa"
$env:SUPER_ADMIN_PASSWORD = $adminCredential.GetNetworkCredential().Password
npm run bootstrap:super-admin --workspace @ssc/api
Remove-Item Env:SUPER_ADMIN_EMAIL, Env:SUPER_ADMIN_FULL_NAME, Env:SUPER_ADMIN_PASSWORD
```

The command is idempotent: rerunning it updates that administrator's name and
password, preserves the organization, activates the `SUPER_ADMIN` membership,
and revokes existing refresh sessions.

Preacher self-registration creates an inactive `PREACHER` membership. A Super
Admin must approve it through
`POST /v1/admin/manager-registrations/:membershipId/approve` before login is
allowed. Public registration can never request the `SUPER_ADMIN` role.

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

## Render test deployment

The root `render.yaml` declares a free Docker web service in Render's Singapore
region. Create a Blueprint from the repository and provide the Neon pooled
`DATABASE_URL` when prompted. Render generates `JWT_SECRET`; never paste the
direct `DATABASE_URL_UNPOOLED` into the runtime service.

The free service is suitable only for development and internal testing because
it can sleep when idle. Apply Prisma migrations separately with the direct Neon
connection before deploying API versions that require schema changes.

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
