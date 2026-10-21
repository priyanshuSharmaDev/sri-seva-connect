import { Router, type Request } from "express";
import { CreateCustomerSchema, CreateFamilyMemberSchema, CreateOccasionSchema, UpdateCustomerSchema } from "@ssc/contracts";
import { buildReminderDedupeKey, normalizeIndianPhone } from "@ssc/domain";
import { requireAuth } from "../auth/middleware.js";
import type { AccessClaims } from "../auth/tokens.js";
import { prisma } from "../db/client.js";
import { AppError } from "../lib/errors.js";
import { customerAccessWhere } from "./access.js";
import { replaceContactFrequency, scheduleContactFrequency } from "./follow-ups.js";

export const customerRouter = Router();
customerRouter.use(requireAuth);

function authOf(request: Request): AccessClaims {
  if (!request.auth) throw new AppError(401, "AUTH_REQUIRED", "Authentication is required");
  return request.auth;
}

customerRouter.get("/", async (request, response) => {
  const auth = authOf(request);
  const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
  const customers = await prisma.customer.findMany({
    where: search
      ? {
          AND: [
            customerAccessWhere(auth),
            { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { normalizedMobileNumber: { contains: search } }] }
          ]
        }
      : customerAccessWhere(auth),
    select: {
      id: true,
      fullName: true,
      mobileNumber: true,
      city: true,
      preferredLanguage: true,
      assignedManagerId: true,
      updatedAt: true
    },
    orderBy: [{ fullName: "asc" }],
    take: 100
  });
  response.json({ data: customers });
});

customerRouter.post("/", async (request, response) => {
  const auth = authOf(request);
  const input = CreateCustomerSchema.parse(request.body);
  if (auth.role === "SUPER_ADMIN" && !input.assignedManagerId) {
    throw new AppError(400, "MANAGER_REQUIRED", "Super Admin must assign the customer to a manager");
  }
  const assignedManagerId = auth.role === "SUPER_ADMIN" && input.assignedManagerId
    ? input.assignedManagerId
    : auth.membershipId;

  const manager = await prisma.organizationMembership.findFirst({
    where: {
      id: assignedManagerId,
      organizationId: auth.organizationId,
      isActive: true,
      role: { in: ["REGIONAL_MANAGER", "STORE_MANAGER"] }
    }
  });
  if (!manager) throw new AppError(400, "INVALID_MANAGER", "Assigned manager is not active in this organization");

  const preferences = input.communicationPreferences;
  const customer = await prisma.$transaction(async (transaction) => {
    const created = await transaction.customer.create({
      data: {
        organizationId: auth.organizationId,
        assignedManagerId,
        fullName: input.fullName,
        mobileNumber: input.mobileNumber,
        normalizedMobileNumber: normalizeIndianPhone(input.mobileNumber),
        alternatePhone: input.alternatePhone ?? null,
        email: input.email ?? null,
        gender: input.gender ?? null,
        dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null,
        profession: input.profession ?? null,
        company: input.company ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        pinCode: input.pinCode ?? null,
        preferredLanguage: input.preferredLanguage ?? null,
        notes: input.notes ?? null,
        allowPhone: preferences?.allowPhone ?? true,
        allowWhatsapp: preferences?.allowWhatsapp ?? true,
        allowSms: preferences?.allowSms ?? true
      }
    });
    await transaction.auditEvent.create({
      data: {
        organizationId: auth.organizationId,
        actorId: auth.membershipId,
        action: "CUSTOMER_CREATED",
        targetType: "Customer",
        targetId: created.id
      }
    });
    await transaction.syncChange.create({
      data: {
        organizationId: auth.organizationId,
        audienceOwnerId: assignedManagerId,
        entityType: "Customer",
        entityId: created.id,
        operation: "UPSERT"
      }
    });
    if (input.contactFrequency) {
      await scheduleContactFrequency(transaction, {
        organizationId: auth.organizationId,
        customerId: created.id,
        customerName: created.fullName,
        managerId: assignedManagerId
      }, input.contactFrequency);
    }
    return created;
  });
  response.status(201).json({ data: customer });
});

customerRouter.patch("/:customerId", async (request, response) => {
  const auth = authOf(request);
  const input = UpdateCustomerSchema.parse(request.body);
  const existing = await prisma.customer.findFirst({
    where: { ...customerAccessWhere(auth), id: request.params.customerId },
    select: { id: true }
  });
  if (!existing) throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");

  const customer = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.customer.update({
      where: { id: existing.id },
      data: {
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.mobileNumber !== undefined && {
          mobileNumber: input.mobileNumber,
          normalizedMobileNumber: normalizeIndianPhone(input.mobileNumber)
        }),
        ...(input.alternatePhone !== undefined && { alternatePhone: input.alternatePhone }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.gender !== undefined && { gender: input.gender }),
        ...(input.dateOfBirth !== undefined && {
          dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null
        }),
        ...(input.profession !== undefined && { profession: input.profession }),
        ...(input.company !== undefined && { company: input.company }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.state !== undefined && { state: input.state }),
        ...(input.pinCode !== undefined && { pinCode: input.pinCode }),
        ...(input.preferredLanguage !== undefined && { preferredLanguage: input.preferredLanguage }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.communicationPreferences && {
          allowPhone: input.communicationPreferences.allowPhone,
          allowWhatsapp: input.communicationPreferences.allowWhatsapp,
          allowSms: input.communicationPreferences.allowSms
        }),
        version: { increment: 1 }
      }
    });
    if (input.contactFrequency !== undefined) {
      await replaceContactFrequency(transaction, {
        organizationId: auth.organizationId,
        customerId: updated.id,
        customerName: updated.fullName,
        managerId: updated.assignedManagerId
      }, input.contactFrequency);
    }
    await transaction.auditEvent.create({
      data: {
        organizationId: auth.organizationId,
        actorId: auth.membershipId,
        action: "CUSTOMER_UPDATED",
        targetType: "Customer",
        targetId: updated.id
      }
    });
    await transaction.syncChange.create({
      data: {
        organizationId: auth.organizationId,
        audienceOwnerId: updated.assignedManagerId,
        entityType: "Customer",
        entityId: updated.id,
        operation: "UPSERT"
      }
    });
    return updated;
  });
  response.json({ data: customer });
});

customerRouter.get("/:customerId", async (request, response) => {
  const auth = authOf(request);
  const customer = await prisma.customer.findFirst({
    where: { ...customerAccessWhere(auth), id: request.params.customerId },
    include: {
      familyMembers: { where: { deletedAt: null }, orderBy: { name: "asc" } },
      followUpSeries: {
        where: { active: true },
        select: { id: true, cadence: true, customIntervalMinutes: true, nextOccurrenceAt: true },
        orderBy: { nextOccurrenceAt: "asc" }
      },
      occasions: {
        where: {
          deletedAt: null,
          ...(auth.role === "SUPER_ADMIN"
            ? {}
            : { OR: [{ visibility: "STANDARD" }, { customer: { assignedManagerId: auth.membershipId } }] })
        },
        include: { reminderRules: { where: { enabled: true } } },
        orderBy: [{ month: "asc" }, { day: "asc" }]
      }
    }
  });
  if (!customer) throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
  response.json({ data: customer });
});

customerRouter.post("/:customerId/family-members", async (request, response) => {
  const auth = authOf(request);
  const input = CreateFamilyMemberSchema.parse(request.body);
  const customer = await prisma.customer.findFirst({
    where: { ...customerAccessWhere(auth), id: request.params.customerId },
    select: { id: true }
  });
  if (!customer) throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
  const familyMember = await prisma.familyMember.create({
    data: {
      organizationId: auth.organizationId,
      customerId: customer.id,
      name: input.name,
      relationship: input.relationship,
      customRelationship: input.customRelationship ?? null,
      dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null,
      phoneNumber: input.phoneNumber ?? null,
      profession: input.profession ?? null,
      anniversaryDate: input.anniversaryDate ? new Date(`${input.anniversaryDate}T00:00:00.000Z`) : null,
      notes: input.notes ?? null
    }
  });
  response.status(201).json({ data: familyMember });
});

customerRouter.post("/:customerId/occasions", async (request, response) => {
  const auth = authOf(request);
  const input = CreateOccasionSchema.parse(request.body);
  const customer = await prisma.customer.findFirst({
    where: { ...customerAccessWhere(auth), id: request.params.customerId },
    select: { id: true }
  });
  if (!customer) throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
  if (input.familyMemberId) {
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        id: input.familyMemberId,
        customerId: customer.id,
        organizationId: auth.organizationId,
        deletedAt: null
      },
      select: { id: true }
    });
    if (!familyMember) {
      throw new AppError(400, "INVALID_FAMILY_MEMBER", "Family member does not belong to this customer");
    }
  }

  const occasion = await prisma.$transaction(async (transaction) => {
    const created = await transaction.occasion.create({
      data: {
        organizationId: auth.organizationId,
        customerId: customer.id,
        familyMemberId: input.familyMemberId ?? null,
        kind: input.kind,
        title: input.title,
        month: input.month,
        day: input.day,
        year: input.year ?? null,
        recurrence: input.recurrence,
        timezone: input.timezone,
        managerNotes: input.managerNotes ?? null,
        visibility: input.kind === "MEMORIAL" ? "RESTRICTED" : input.visibility,
        reminderRules: {
          create: [...new Set(input.reminderOffsetsInDays)].map((days) => ({ offsetMinutes: days * 1440 }))
        }
      },
      include: { reminderRules: true }
    });
    await transaction.domainOutbox.create({
      data: {
        organizationId: auth.organizationId,
        eventType: "OCCASION_CHANGED",
        aggregateType: "Occasion",
        aggregateId: created.id,
        payload: { occasionId: created.id, customerId: customer.id }
      }
    });
    return created;
  });
  response.status(201).json({ data: occasion });
});

customerRouter.post("/:customerId/transfer", async (request, response) => {
  const auth = authOf(request);
  if (auth.role !== "SUPER_ADMIN") throw new AppError(403, "FORBIDDEN", "Only a Super Admin can transfer customers");
  const { managerId } = request.body as { managerId?: string };
  if (!managerId) throw new AppError(400, "MANAGER_REQUIRED", "managerId is required");

  const manager = await prisma.organizationMembership.findFirst({
    where: {
      id: managerId,
      organizationId: auth.organizationId,
      isActive: true,
      role: { in: ["REGIONAL_MANAGER", "STORE_MANAGER"] }
    }
  });
  if (!manager) throw new AppError(400, "INVALID_MANAGER", "Manager is not active in this organization");

  await prisma.$transaction(async (transaction) => {
    const result = await transaction.customer.updateMany({
      where: { id: request.params.customerId, organizationId: auth.organizationId, deletedAt: null },
      data: { assignedManagerId: managerId, version: { increment: 1 } }
    });
    if (result.count === 0) throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
    const futureReminders = await transaction.reminder.findMany({
      where: {
        customerId: request.params.customerId,
        organizationId: auth.organizationId,
        state: { in: ["PENDING", "SNOOZED"] },
        dueAt: { gt: new Date() }
      },
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        occurrenceDate: true,
        offsetMinutes: true
      }
    });
    for (const reminder of futureReminders) {
      const occurrenceDate = reminder.occurrenceDate.toISOString().slice(0, 10);
      await transaction.reminder.update({
        where: { id: reminder.id },
        data: {
          ownerId: managerId,
          dedupeKey: buildReminderDedupeKey({
            organizationId: auth.organizationId,
            sourceType: reminder.sourceType,
            sourceId: reminder.sourceId,
            occurrenceDate,
            offsetMinutes: reminder.offsetMinutes,
            ownerId: managerId
          }),
          version: { increment: 1 }
        }
      });
    }
    await transaction.auditEvent.create({
      data: {
        organizationId: auth.organizationId,
        actorId: auth.membershipId,
        action: "CUSTOMER_TRANSFERRED",
        targetType: "Customer",
        targetId: request.params.customerId,
        metadata: { toManagerId: managerId }
      }
    });
    await transaction.domainOutbox.create({
      data: {
        organizationId: auth.organizationId,
        eventType: "CUSTOMER_TRANSFERRED",
        aggregateType: "Customer",
        aggregateId: request.params.customerId,
        payload: { customerId: request.params.customerId, toManagerId: managerId }
      }
    });
  });
  response.status(204).send();
});
