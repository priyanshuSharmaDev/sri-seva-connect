# Sri Seva Connect — Architecture

## 1. Product intent

Sri Seva Connect is a mobile-first relationship CRM for Regional Managers and
Store Managers. Its primary job is to help an assigned manager remember
important moments, contact a customer personally, and retain a trustworthy
history of that relationship.

Product decisions use this priority order:

1. Customer ownership, privacy, and assignment.
2. Customer and family profiles.
3. Important occasions and reliable reminders.
4. Personal communication history and follow-ups.
5. Offline-first mobile use.
6. Import, administration, and reporting.
7. Campaigns, promotions, store visits, and location-based segmentation.

Campaign features remain supported by the architecture, but must not dominate
navigation, dashboards, notifications, or the core domain model.

## 2. Core journey

```text
Create/import customer
  -> add family and communication preferences
  -> record occasions
  -> configure reminder offsets/contact cadence
  -> synchronize and schedule reminders
  -> notify assigned manager
  -> call, WhatsApp, or SMS
  -> record interaction
  -> optionally schedule follow-up
```

## 3. System context

```text
Android app (React Native + Expo)
  |-- SQLite local database and sync outbox
  |-- Expo local notifications
  |-- phone / WhatsApp / SMS deep links
  |
  +---- HTTPS/JSON ---- Express API (Node.js + TypeScript)
                         |-- authentication and authorization
                         |-- customer relationship domain
                         |-- sync and import APIs
                         |-- reminder scheduler workers
                         |-- push notification delivery
                         |
                         +---- PostgreSQL (Prisma)
                         +---- push provider (Expo Push Service initially)
                         +---- object storage for import artifacts (optional)
```

The server is authoritative for shared business data and access control.
SQLite is an offline projection, not a security boundary. Every API, export,
push payload, and sync response enforces organization membership and customer
visibility on the server.

## 4. Repository shape

Use an npm-workspaces monorepo so shared contracts and domain rules are defined
once.

```text
apps/
  api/                  Express API and background worker entry points
  mobile/               Expo React Native Android-first application
packages/
  contracts/            API schemas, DTOs, enums, and generated types
  domain/               Pure date, recurrence, permission, and sync rules
  config/               Shared TypeScript, lint, and test configuration
prisma/
  schema.prisma
  migrations/
docs/
  ARCHITECTURE.md
  IMPLEMENTATION_PLAN.md
docker-compose.yml
package.json
```

`packages/domain` contains side-effect-free logic used by API workers and the
mobile app. Platform integrations remain behind interfaces. This avoids
duplicating reminder calculations, validation, and permission terminology.

## 5. Domain boundaries

### Identity and organization

- `Organization` is the tenant boundary.
- `User` is authenticated independently of role.
- `OrganizationMembership` assigns `SUPER_ADMIN`, `REGIONAL_MANAGER`, or
  `STORE_MANAGER` within one organization.
- A disabled membership immediately loses API and sync access.
- Short-lived access tokens and rotating refresh tokens are stored securely on
  device. Refresh-token records are revocable and hashed at rest.

### Customer access

- Every customer has exactly one current `assignedManagerId`.
- `CustomerShare` grants explicit, revocable access to another manager.
- A manager may read a customer only when assigned or actively shared.
- Super Admin may read all customers in the organization and transfer
  ownership.
- Ownership transfer is a single database transaction and emits a domain event
  for reminder reassignment and device synchronization.
- Child records inherit customer visibility; they are never queried as
  independently shareable resources.

Authorization is expressed through reusable policy functions and applied at
the service/repository boundary, not only in HTTP controllers. Raw customer
queries are not exposed to controllers, exports, or sync code.

### Customer profile

Required fields are deliberately minimal:

- full name;
- mobile number;
- organization;
- assigned manager.

Optional fields include alternate phone, email, gender, date of birth,
profession, company, address, city, state, PIN code, preferred language,
notes, and communication preferences. Communication preferences use explicit
channel consent and opt-out fields rather than a single ambiguous flag.

Normalize phone numbers to E.164 when possible while preserving the entered
display value. Store date-only values as PostgreSQL `date`/ISO `YYYY-MM-DD`,
never as midnight timestamps.

### Family

A customer has zero or more `FamilyMember` records. Relationship is a stable
enum (`SPOUSE`, `SON`, `DAUGHTER`, `PARENT`, `SIBLING`, `CUSTOM`) plus an
optional custom label. Fields are name, relationship, DOB, phone, profession,
anniversary date, and notes. Family members use stable UUIDs so they can be
edited offline and referenced by occasions.

### Occasions

`Occasion` belongs to a customer and may optionally reference a family member.
Kinds are:

- `BIRTHDAY`
- `WEDDING_ANNIVERSARY`
- `FESTIVAL`
- `CUSTOM`
- `MEMORIAL`

An occasion stores month and day, optional year, recurrence rule, timezone,
manager-specific notes, visibility, and status. A customer DOB or family DOB
may create a linked occasion, but the date has one canonical source; linked
occasion projections must not become conflicting copies.

Memorial occasions default to `RESTRICTED`. Their title, notes, notifications,
exports, logs, and offline projection are visible only to authorized users.
Push payloads contain a generic message when the device is locked or sensitive
content is not permitted.

`OccasionReminderRule` stores one or more offsets in minutes. Presets map to
0, 1, 3, and 7 days before the occurrence; custom offsets use the same model.
Optional occurrence year distinguishes dated one-off events from annual
recurrence. Invalid dates are rejected, with a documented February 29 policy:
notify on February 29 in leap years and on February 28 otherwise, unless the
organization later configures a different policy.

### Follow-ups and communication

`Communication` is an immutable interaction record with channel (`PHONE`,
`WHATSAPP`, `SMS`, `IN_PERSON`, `OTHER`), timestamp, manager, outcome, and
optional notes. Corrections are audited rather than silently rewriting history.

`FollowUpSeries` represents weekly, twice-weekly, monthly, or custom contact
frequency. It generates individual `Reminder` records incrementally rather
than materializing an unbounded future series. Completing an interaction may
complete its linked reminder and generate the next occurrence.

### Secondary domains

Campaign, invitation, store visit, and location-segment records reference
customers through their own modules. They cannot own customer identity,
communication consent, occasion data, or reminder scheduling. This boundary
allows secondary features to evolve without changing the core journey.

## 6. Core data model

All mutable tables include `id` (UUID), `organizationId`, `createdAt`,
`updatedAt`, `version`, and nullable `deletedAt` unless explicitly immutable.
`version` is incremented on each write for optimistic concurrency and sync.

| Aggregate | Important relationships and constraints |
| --- | --- |
| Organization | Owns memberships, customers, stores, and settings |
| User / Membership | Unique user + organization; role and active status |
| Customer | One assigned manager; normalized mobile indexed per organization |
| CustomerShare | Unique customer + manager; expiry/revocation supported |
| FamilyMember | Many per customer; custom relationship label when required |
| Occasion | Customer-owned; optional family member; recurrence and visibility |
| OccasionReminderRule | Unique occasion + offset; enabled flag |
| FollowUpSeries | Customer + assigned manager + cadence + next occurrence |
| Reminder | One owner, due time, state, source type/id, deterministic dedupe key |
| Communication | Customer + actor + channel + occurred-at; append-oriented |
| Device | User device, timezone, push token, permissions, last sync time |
| SyncChange | Ordered organization/user-visible change cursor |
| AuditEvent | Actor, action, target, metadata, timestamp; append-only |

Reminder states are `PENDING`, `SNOOZED`, `COMPLETED`, `CANCELLED`, and
`EXPIRED`. A partial unique index on active `dedupeKey` prevents duplicate
pending/snoozed reminders. The dedupe key is derived from organization,
source, occurrence date, offset, and owner.

## 7. Reminder and notification design

### Scheduling

1. Occasion/follow-up writes commit domain data and an outbox event in one
   PostgreSQL transaction.
2. A worker claims outbox events with `FOR UPDATE SKIP LOCKED`.
3. The scheduler calculates upcoming occurrences in the occasion timezone.
4. Reminder rows are upserted using deterministic dedupe keys.
5. A dispatcher claims due reminders and records each delivery attempt.
6. Push delivery is retried with bounded exponential backoff; permanent token
   errors disable the device token.
7. Mobile sync schedules corresponding local notifications for a limited
   horizon and stores the platform notification identifier.

Server push is authoritative for due reminders when the device is online.
Local notifications provide synchronized offline reliability. The app
reconciles both through the same reminder ID and suppresses a local alert after
receipt/completion of its server notification.

### Rescheduling

Changes to occasion dates, reminder rules, timezone, quiet hours, or ownership
cancel affected future reminders and generate replacements transactionally.
Completed communication history is never moved or deleted. Ownership transfer
updates all active future reminders to the new manager and invalidates old
manager device schedules through sync tombstones.

### Time and quiet hours

- Store instants in UTC and the originating IANA timezone separately.
- Calculate recurring local dates with a timezone-aware library; do not add
  fixed 24-hour durations across DST transitions.
- Device timezone changes trigger local rescheduling, but do not silently
  rewrite an occasion's selected timezone.
- Organization/user quiet hours defer notifications to the next allowed local
  time while retaining the original due time for audit and overdue status.
- If notification permission is denied, the app presents an in-app status and
  settings action; reminders remain visible and synchronized.

### Operational safety

- Scheduler and dispatcher jobs are idempotent.
- PostgreSQL advisory locks or singleton job leases prevent overlapping sweep
  jobs; row locks still protect individual work.
- Delivery attempts have correlation IDs, provider response codes, and no
  sensitive note content.
- Metrics cover scheduling lag, due-to-delivery latency, duplicate prevention,
  failed deliveries, and unsynchronized devices.

## 8. API design

Version JSON APIs under `/v1`. Validate request and response contracts from
shared schemas. Use opaque cursor pagination for mutable lists.

Primary resources:

```text
/v1/auth/*
/v1/me/devices
/v1/customers
/v1/customers/:id/family-members
/v1/customers/:id/occasions
/v1/customers/:id/communications
/v1/customers/:id/follow-ups
/v1/customers/:id/shares
/v1/customers/:id/transfer
/v1/reminders
/v1/dashboard/today
/v1/sync/pull
/v1/sync/push
/v1/imports
```

Mutations accept an `Idempotency-Key`, expected entity `version`, and client
operation ID. Conflicts return a typed `409` response instead of silently
overwriting edits. Transfer and share endpoints require explicit privileged
policies. Exports use the same scoped repositories as interactive APIs.

The dashboard API is relationship-oriented: today's birthdays, today's
anniversaries, family occasions, upcoming events, pending follow-ups, overdue
reminders, and customer shortcuts. Campaign statistics must not displace these
sections.

## 9. Offline synchronization

SQLite mirrors only records the current user is allowed to access. Each local
mutation is written to the entity table and an outbox in one SQLite
transaction.

Sync protocol:

1. Push ordered client operations with stable operation IDs.
2. Server authorizes every operation against current ownership/share state.
3. Server applies idempotently and returns accepted versions or typed
   conflicts.
4. Pull changes after an opaque server cursor, including tombstones.
5. Apply the page in one SQLite transaction and advance the cursor only after
   success.
6. Reconcile and reschedule local notifications.

On revocation or transfer, inaccessible customer data and sensitive local
notifications are removed promptly. Local databases use platform-protected
storage for secrets, and sensitive values should be encrypted at rest where
supported. The server never trusts a locally cached role or prior access grant.

Conflict defaults:

- append-only communications merge naturally;
- non-overlapping profile fields may merge through an explicit resolver;
- same-field edits and deletes surface a conflict to the user;
- assignment, sharing, consent, and restricted visibility are server-wins;
- an unauthorized queued mutation is rejected and removed from retry loops.

## 10. Mobile application

Use Expo Router for simple mobile navigation and a data layer separating
screens from SQLite/sync implementations.

Primary navigation:

- **Today** — relationship dashboard and reminder actions.
- **Customers** — assigned/shared customers, search, and add/import.
- **Activity** — communications and follow-ups.
- **More** — notification settings, sync state, account, and secondary tools.

Customer detail prioritizes profile, family, occasions, and interaction
history. Call, WhatsApp, and SMS are contextual actions. Completing, snoozing,
or rescheduling is possible directly from a reminder card.

Visual system: navy and white foundations, warm-neutral surfaces, restrained
gold accents, high-contrast text, minimum 44x44 touch targets, scalable type,
screen-reader labels, visible focus, and non-color-only status indicators.

## 11. Security and privacy

- Tenant ID is derived from authenticated membership, never trusted from a
  client-provided filter.
- Repository methods require an access scope and default to no rows.
- Restricted occasions use field-level serialization rules.
- Audit customer reads, exports, transfers, sharing changes, and restricted
  record access.
- Rate-limit authentication, import, export, and notification endpoints.
- Keep secrets in environment/secret management; validate configuration on
  process startup.
- Minimize PII in logs, analytics, crash reports, notification bodies, and job
  payloads.
- Encrypt traffic with TLS and use encrypted database/backups in hosted
  environments.
- Define retention and deletion policies before production launch.

## 12. Deployment and operations

Local development uses Docker Compose for PostgreSQL plus separate API and
worker processes. Production begins with low-cost managed PostgreSQL and one
container image running distinct API, scheduler, and worker commands. Horizontal
scaling is safe because jobs use database-backed coordination and idempotency.

Required health endpoints distinguish liveness from readiness. Structured logs,
database migration status, error reporting, backups, restore tests, and reminder
delivery metrics are release requirements. Prisma migrations run as an explicit
deployment step, never implicitly in every application replica.

## 13. Compatibility rules

When integrating existing or future functionality:

- prefer additive migrations and backward-compatible API changes;
- put breaking response changes behind a new API version;
- retain campaign/store data and routes while moving them out of primary
  navigation;
- do not reuse campaign consent as personal communication preference;
- backfill new ownership/reminder fields before enforcing non-null constraints;
- use feature flags for migrations that require coordinated server/mobile
  rollout;
- never regenerate or delete communication history during assignment changes.

