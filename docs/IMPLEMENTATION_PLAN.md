# Sri Seva Connect — Implementation Plan

## 1. Delivery principles

- Build vertical, testable slices in the required dependency order.
- Preserve working behavior through additive migrations, compatibility tests,
  and feature flags.
- Keep domain rules in shared pure modules and integrations behind interfaces.
- Treat authorization, notification reliability, and offline correctness as
  product features, not cleanup work.
- Use npm and npm workspaces exclusively.
- Target Android first while avoiding Android-only domain code.

## 2. Definition of done for every increment

An increment is complete only when:

- API and domain behavior has automated tests;
- authorization includes allowed and denied cases;
- database changes include a reviewed Prisma migration and rollback/forward-fix
  notes;
- mobile changes handle loading, empty, offline, error, and accessible states;
- syncable mutations are idempotent and conflict-aware;
- logs exclude customer PII and include trace/correlation IDs;
- relevant architecture and API documentation is updated;
- existing regression tests remain green.

## 3. Phased delivery

### Phase 0 — Baseline and compatibility inventory

Goal: establish a safe starting point before changing working behavior.

- Inventory existing API routes, database tables, app screens, notification
  code, tests, deployment assets, and campaign/store features.
- Capture current schemas and behavior with characterization tests.
- Establish npm workspaces, shared TypeScript configuration, formatting,
  linting, and test commands without changing runtime behavior.
- Add CI for install, typecheck, lint, unit tests, integration tests, and builds.
- Document environment variables and create Docker Compose local services.
- Create feature flags for relationship dashboard, reminder engine, and sync-v2
  if an existing rollout requires coexistence.

Exit criteria: current application builds and runs through the standardized npm
commands, and working behavior has a regression safety net.

### Phase 1 — Database and backend foundation

Goal: establish tenant-safe relationship aggregates and infrastructure.

- Model organizations, users, memberships, customers, shares, family members,
  occasions, reminder rules, reminders, communications, follow-up series,
  devices, sync changes, domain outbox, and audit events in Prisma.
- Use UUIDs, UTC timestamps, date-only columns, entity versions, soft-delete
  tombstones, and required indexes.
- Add uniqueness/index strategy for normalized mobile, assignment queries,
  occasion look-ahead, due reminders, dedupe keys, and sync cursors.
- Build configuration validation, error envelope, request IDs, structured logs,
  health endpoints, and transaction helpers.
- Add migration and seed workflows for local development.

Exit criteria: migrations apply to a clean and representative existing
database; repositories enforce organization scope; Docker-based API and worker
processes are healthy.

### Phase 2 — Authentication and manager ownership

Goal: make assignment and visibility correct before exposing customer data.

- Implement sign-in, refresh rotation, logout/revocation, and device
  registration.
- Add reusable role and customer-access policies.
- Apply policies to list, detail, mutation, export, and sync paths.
- Implement explicit sharing with revocation/expiry.
- Implement Super Admin ownership transfer as one transaction.
- Emit transfer outbox/audit events and make future reminder reassignment
  idempotent.

Exit criteria: managers see only assigned/shared customers; Super Admin sees
organization customers; transfer preserves all child/history records; denied
records cannot be inferred through counts, search, export, or sync.

### Phase 3 — Customer and family CRUD

Goal: support the first two steps of the core journey online and offline-ready.

- Implement customer create, search, detail, update, archive, and pagination.
- Require only full name, mobile, and assignment; keep other requested fields
  optional.
- Add E.164 normalization, preferred language, notes, and channel-specific
  communication preferences.
- Implement unbounded family-member CRUD with standard/custom relationships.
- Use shared validation contracts in API and app-facing packages.
- Emit versioned sync changes and audit sensitive mutations.

Exit criteria: assigned managers can maintain complete customer/family profiles;
cross-manager access tests fail closed; validation supports partial profiles.

### Phase 4 — Important occasions

Goal: make customer and family occasions a first-class domain.

- Implement birthdays, anniversaries, festivals, custom, and restricted
  memorial occasions.
- Link DOB/anniversary-derived occasions to one canonical date source.
- Support optional year, recurrence, timezone, multiple reminder offsets, and
  manager-specific notes.
- Add restricted serialization, generic notification preview, audit behavior,
  and export exclusion rules.
- Add look-ahead and day-grouped query endpoints.

Exit criteria: occurrence calculation is deterministic across year boundaries,
leap years, and timezones; restricted data is visible only to permitted users.

### Phase 5 — Reminder scheduler and notifications

Goal: deliver reliable, non-duplicated reminders.

- Implement transactional outbox processing and occurrence generation.
- Support event-day, 1/3/7-day, and custom offsets.
- Implement weekly, twice-weekly, monthly, and custom follow-up cadence.
- Build idempotent reminder upsert, due-item claim, delivery-attempt tracking,
  retry/backoff, and invalid-token handling.
- Integrate Expo Push Service behind a provider interface.
- Add local-notification reconciliation and finite scheduling horizon.
- Reschedule after occasion, offset, timezone, quiet-hour, or assignment changes.
- Add complete, snooze, reschedule, cancel, and overdue behavior.
- Surface notification permission state and recovery actions.

Exit criteria: the same source occurrence cannot create duplicate active
notifications; server and local delivery reconcile; transfer alerts only the
new manager; quiet hours and permission denial behave predictably.

### Phase 6 — Communication history

Goal: close the relationship loop after a manager contacts a customer.

- Add quick phone, WhatsApp, and SMS actions that honor communication
  preferences.
- Record channel, manager, occurrence time, outcome, and optional notes.
- Link a communication to a reminder and complete it atomically.
- Allow an optional next follow-up or recurring contact series.
- Display append-oriented, paginated customer interaction history.
- Audit corrections while retaining original attribution.

Exit criteria: a manager can act from a reminder, record the result, and create
the next follow-up without leaving the customer context.

### Phase 7 — React Native mobile interface

Goal: deliver the relationship-first Android workflow.

- Create Today, Customers, Activity, and More navigation.
- Build dashboard sections in this order: today's birthdays, today's
  anniversaries, family occasions, upcoming events, pending follow-ups,
  overdue reminders, and customer shortcuts.
- Implement customer profile, family, occasion, reminder, and communication
  flows with optimistic but reversible feedback.
- Add reminder complete/snooze/reschedule actions and quick contact actions.
- Apply navy/white/warm-neutral/gold design tokens and accessibility standards.
- Keep campaign and store tools in secondary navigation.

Exit criteria: an Android user can complete the full core journey with keyboard,
screen-reader, large-text, offline-state, and empty-state coverage.

### Phase 8 — Offline synchronization

Goal: make core manager workflows dependable with intermittent connectivity.

- Define SQLite migrations and repositories for authorized customer data.
- Add atomic local entity + outbox writes.
- Implement idempotent sync push, cursor pull, tombstones, pagination, and
  retry/backoff.
- Implement optimistic concurrency and conflict UI.
- Treat assignment, sharing, consent, and restricted visibility as server-wins.
- Purge revoked/transferred records and cancel associated local notifications.
- Add sync-state diagnostics without exposing PII.

Exit criteria: create/edit/communicate/follow-up works offline and converges
after reconnection; repeated/interrupted sync causes no duplicate mutations;
revoked data is removed.

### Phase 9 — Excel import

Goal: safely onboard customer data without bypassing permissions or validation.

- Publish an import template for essential and optional customer fields, family
  members, and occasions.
- Implement upload, parse, dry-run validation, row-level errors, preview,
  manager mapping, and explicit commit.
- Normalize phones/dates/languages and detect probable duplicates.
- Process committed imports asynchronously in bounded batches with idempotency.
- Generate the same domain events/reminders as interactive creation.
- Provide an authorization-scoped result report.

Exit criteria: invalid rows never partially mutate data; retrying a committed
import does not duplicate customers or reminders; imported records follow the
same access policies.

### Phase 10 — Testing, hardening, and deployment

Goal: validate production behavior and operate it safely at low cost.

- Run migration tests from clean and representative prior schemas.
- Add end-to-end core journey and accessibility tests on Android.
- Add load tests for dashboard, sync, occurrence generation, and due dispatch.
- Add backup/restore drill, retention rules, rate limits, and security review.
- Containerize API and worker commands; deploy managed PostgreSQL and secrets.
- Add alerting for scheduler lag, failed notification rate, worker health,
  database capacity, and repeated sync failures.
- Stage rollout through internal, pilot-manager, and organization-wide groups.

Exit criteria: release gates below pass, restore is proven, monitoring is
actionable, and rollback/forward-fix procedures are documented.

### Phase 11 — Secondary campaign functionality

Goal: retain useful campaign/store capabilities without weakening the core.

- Integrate store campaigns, location filtering, promotional invitations, and
  store visit tracking as separate modules.
- Reuse customer identity and consent policies; do not duplicate profiles.
- Keep promotional notifications distinct from personal reminders and honor
  channel opt-out.
- Measure secondary usage without changing the relationship-first dashboard.

Exit criteria: secondary modules cannot access customers beyond the actor's
scope, cannot override personal reminders, and remain outside primary flows.

## 4. Test strategy

### Unit and property tests

- occurrence generation for all recurrence types;
- February 29 behavior over leap/non-leap centuries;
- timezone and DST boundaries;
- quiet-hour deferral;
- dedupe-key stability;
- weekly, twice-weekly, monthly, and custom cadence;
- access-policy matrices and restricted serialization;
- conflict resolution and operation idempotency.

Use fake clocks and generated date ranges. Domain tests must not depend on the
host timezone.

### Integration tests

- Prisma repositories against real PostgreSQL;
- tenant and ownership isolation on every resource;
- transfer transaction, outbox, reminder reassignment, and rollback;
- worker concurrency and retry behavior;
- push-provider success, transient error, permanent error, and timeout;
- export and import scoping;
- sync pagination, tombstones, interrupted retries, and revoked access.

### Mobile tests

- SQLite migration and atomic outbox behavior;
- local-notification schedule/reconcile/cancel using adapter fakes;
- permission granted, denied, and later-enabled flows;
- offline CRUD and communication capture;
- conflict, transfer, logout, and data-purge flows;
- dashboard actions and deep links to phone/WhatsApp/SMS;
- accessibility labels, focus order, contrast, touch targets, and large text.

### End-to-end scenarios

1. Create customer -> add spouse -> add anniversary -> receive reminder ->
   WhatsApp -> record interaction -> schedule follow-up.
2. Edit a birthday while offline -> reconnect -> replace old reminder without
   duplicates.
3. Transfer a customer -> old manager loses access/local data -> new manager
   receives future reminders -> history remains intact.
4. Create a restricted memorial -> unauthorized manager/export/push preview
   cannot reveal it.
5. Cross a timezone/DST boundary and quiet hours -> reminder fires once at the
   intended allowed local time.
6. Deny notification permission -> reminder remains visible and app provides a
   settings recovery path.

## 5. Release gates

The first production release requires:

- zero known cross-tenant or cross-manager authorization defects;
- passing transfer, export, and offline revocation tests;
- passing timezone, quiet-hour, leap-year, and duplicate-notification suites;
- idempotent retry proof for API mutations, sync operations, and workers;
- verified Android notification permission and background behavior on supported
  OS versions;
- successful backup restore and migration rehearsal;
- monitored API/worker health and reminder delivery metrics;
- documented privacy, retention, incident, and rollback procedures.

## 6. Initial executable backlog

Work should begin with these small, dependency-ordered deliverables:

1. Scaffold npm workspaces and standard scripts.
2. Add Docker Compose PostgreSQL and validated environment configuration.
3. Create Prisma schema for identity, membership, customer, and audit records.
4. Implement tenant-scoped repositories and their denial tests.
5. Add authentication/session lifecycle.
6. Add customer assignment, sharing, and transactional transfer.
7. Add customer/family contracts and CRUD.
8. Extend schema and pure domain functions for occasions.
9. Add reminder/outbox schema before adding scheduler processes.
10. Build a thin Android vertical slice: sign-in -> Today -> customer detail.

Do not begin campaign UI expansion until the Phase 10 release gates for the
relationship journey are met, unless required to preserve existing behavior.
