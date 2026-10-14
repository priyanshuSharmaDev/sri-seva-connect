-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "FamilyRelationship" AS ENUM ('SPOUSE', 'SON', 'DAUGHTER', 'PARENT', 'SIBLING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OccasionKind" AS ENUM ('BIRTHDAY', 'WEDDING_ANNIVERSARY', 'FESTIVAL', 'CUSTOM', 'MEMORIAL');

-- CreateEnum
CREATE TYPE "OccasionVisibility" AS ENUM ('STANDARD', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "RecurrenceKind" AS ENUM ('NONE', 'ANNUAL');

-- CreateEnum
CREATE TYPE "ReminderState" AS ENUM ('PENDING', 'SNOOZED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReminderSourceType" AS ENUM ('OCCASION', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('PHONE', 'WHATSAPP', 'SMS', 'IN_PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpCadence" AS ENUM ('WEEKLY', 'TWICE_WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "installationId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "expoPushToken" TEXT,
    "notificationsPermitted" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "assignedManagerId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "normalizedMobileNumber" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "email" TEXT,
    "gender" "Gender",
    "dateOfBirth" DATE,
    "profession" TEXT,
    "company" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pinCode" TEXT,
    "preferredLanguage" TEXT,
    "notes" TEXT,
    "allowPhone" BOOLEAN NOT NULL DEFAULT true,
    "allowWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "allowSms" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerShare" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "managerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" "FamilyRelationship" NOT NULL,
    "customRelationship" TEXT,
    "dateOfBirth" DATE,
    "phoneNumber" TEXT,
    "profession" TEXT,
    "anniversaryDate" DATE,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Occasion" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "familyMemberId" UUID,
    "kind" "OccasionKind" NOT NULL,
    "title" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "year" INTEGER,
    "recurrence" "RecurrenceKind" NOT NULL DEFAULT 'ANNUAL',
    "timezone" TEXT NOT NULL,
    "managerNotes" TEXT,
    "visibility" "OccasionVisibility" NOT NULL DEFAULT 'STANDARD',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Occasion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccasionReminderRule" (
    "id" UUID NOT NULL,
    "occasionId" UUID NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OccasionReminderRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "sourceType" "ReminderSourceType" NOT NULL,
    "sourceId" UUID NOT NULL,
    "occurrenceDate" DATE NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "originalDueAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "state" "ReminderState" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "managerId" UUID NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "outcome" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpSeries" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "managerId" UUID NOT NULL,
    "cadence" "FollowUpCadence" NOT NULL,
    "customIntervalMinutes" INTEGER,
    "nextOccurrenceAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainOutbox" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DomainOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncChange" (
    "id" BIGSERIAL NOT NULL,
    "organizationId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "payload" JSONB,
    "audienceOwnerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshSession_userId_revokedAt_expiresAt_idx" ON "RefreshSession"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "RefreshSession_membershipId_revokedAt_expiresAt_idx" ON "RefreshSession"("membershipId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_role_isActive_idx" ON "OrganizationMembership"("organizationId", "role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Device_organizationId_membershipId_idx" ON "Device"("organizationId", "membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_membershipId_installationId_key" ON "Device"("membershipId", "installationId");

-- CreateIndex
CREATE INDEX "Customer_organizationId_assignedManagerId_deletedAt_idx" ON "Customer"("organizationId", "assignedManagerId", "deletedAt");

-- CreateIndex
CREATE INDEX "Customer_organizationId_normalizedMobileNumber_idx" ON "Customer"("organizationId", "normalizedMobileNumber");

-- CreateIndex
CREATE INDEX "Customer_organizationId_fullName_idx" ON "Customer"("organizationId", "fullName");

-- CreateIndex
CREATE INDEX "CustomerShare_managerId_revokedAt_expiresAt_idx" ON "CustomerShare"("managerId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerShare_customerId_managerId_key" ON "CustomerShare"("customerId", "managerId");

-- CreateIndex
CREATE INDEX "FamilyMember_organizationId_customerId_deletedAt_idx" ON "FamilyMember"("organizationId", "customerId", "deletedAt");

-- CreateIndex
CREATE INDEX "Occasion_organizationId_customerId_deletedAt_idx" ON "Occasion"("organizationId", "customerId", "deletedAt");

-- CreateIndex
CREATE INDEX "Occasion_organizationId_month_day_deletedAt_idx" ON "Occasion"("organizationId", "month", "day", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OccasionReminderRule_occasionId_offsetMinutes_key" ON "OccasionReminderRule"("occasionId", "offsetMinutes");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_dedupeKey_key" ON "Reminder"("dedupeKey");

-- CreateIndex
CREATE INDEX "Reminder_organizationId_ownerId_state_dueAt_idx" ON "Reminder"("organizationId", "ownerId", "state", "dueAt");

-- CreateIndex
CREATE INDEX "Reminder_organizationId_sourceType_sourceId_idx" ON "Reminder"("organizationId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "Communication_organizationId_customerId_occurredAt_idx" ON "Communication"("organizationId", "customerId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "FollowUpSeries_organizationId_managerId_active_nextOccurren_idx" ON "FollowUpSeries"("organizationId", "managerId", "active", "nextOccurrenceAt");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_targetType_targetId_createdAt_idx" ON "AuditEvent"("organizationId", "targetType", "targetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DomainOutbox_processedAt_createdAt_idx" ON "DomainOutbox"("processedAt", "createdAt");

-- CreateIndex
CREATE INDEX "SyncChange_organizationId_id_idx" ON "SyncChange"("organizationId", "id");

-- CreateIndex
CREATE INDEX "SyncChange_organizationId_audienceOwnerId_id_idx" ON "SyncChange"("organizationId", "audienceOwnerId", "id");

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assignedManagerId_fkey" FOREIGN KEY ("assignedManagerId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerShare" ADD CONSTRAINT "CustomerShare_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerShare" ADD CONSTRAINT "CustomerShare_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occasion" ADD CONSTRAINT "Occasion_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occasion" ADD CONSTRAINT "Occasion_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccasionReminderRule" ADD CONSTRAINT "OccasionReminderRule_occasionId_fkey" FOREIGN KEY ("occasionId") REFERENCES "Occasion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSeries" ADD CONSTRAINT "FollowUpSeries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSeries" ADD CONSTRAINT "FollowUpSeries_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
