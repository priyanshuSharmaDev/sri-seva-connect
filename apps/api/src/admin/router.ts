import { Router } from "express";
import { ApproveManagerSchema, TransferManagerCustomersSchema } from "@ssc/contracts";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { transferCustomerOwnership } from "../customers/transfers.js";
import { prisma } from "../db/client.js";
import { AppError } from "../lib/errors.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("SUPER_ADMIN"));

adminRouter.get("/manager-registrations", async (request, response) => {
  const registrations = await prisma.organizationMembership.findMany({
    where: {
      organizationId: request.auth!.organizationId,
      isActive: false,
      role: { in: ["REGIONAL_MANAGER", "STORE_MANAGER"] }
    },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, email: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  response.json({ registrations });
});

adminRouter.get("/managers", async (request, response) => {
  const managers = await prisma.organizationMembership.findMany({
    where: {
      organizationId: request.auth!.organizationId,
      isActive: true,
      role: { in: ["REGIONAL_MANAGER", "STORE_MANAGER"] }
    },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { fullName: true, email: true } },
      _count: { select: { assignedCustomers: { where: { deletedAt: null } } } }
    },
    orderBy: { user: { fullName: "asc" } }
  });
  response.json({ managers });
});

adminRouter.get("/managers/:managerId/customers", async (request, response) => {
  const manager = await prisma.organizationMembership.findFirst({
    where: {
      id: request.params.managerId,
      organizationId: request.auth!.organizationId,
      isActive: true,
      role: { in: ["REGIONAL_MANAGER", "STORE_MANAGER"] }
    },
    select: { id: true, role: true, user: { select: { fullName: true, email: true } } }
  });
  if (!manager) throw new AppError(404, "MANAGER_NOT_FOUND", "Active manager was not found");

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: request.auth!.organizationId,
      assignedManagerId: manager.id,
      deletedAt: null
    },
    select: {
      id: true,
      fullName: true,
      mobileNumber: true,
      city: true,
      preferredLanguage: true,
      assignedManagerId: true,
      updatedAt: true
    },
    orderBy: { fullName: "asc" },
    take: 500
  });
  response.json({ manager, customers });
});

adminRouter.post("/manager-registrations/:membershipId/approve", async (request, response) => {
  const input = ApproveManagerSchema.parse(request.body ?? {});
  const registration = await prisma.organizationMembership.findFirst({
    where: {
      id: request.params.membershipId,
      organizationId: request.auth!.organizationId,
      isActive: false,
      role: { in: ["REGIONAL_MANAGER", "STORE_MANAGER"] }
    },
    select: { id: true, userId: true }
  });

  if (!registration) {
    throw new AppError(404, "REGISTRATION_NOT_FOUND", "Pending manager registration was not found");
  }

  const result = await prisma.$transaction(async (transaction) => {
    let transferredCustomers = 0;
    if (input.transferFromManagerId) {
      const previousManager = await transaction.organizationMembership.findFirst({
        where: {
          id: input.transferFromManagerId,
          organizationId: request.auth!.organizationId,
          isActive: true,
          role: { in: ["REGIONAL_MANAGER", "STORE_MANAGER"] }
        },
        select: { id: true }
      });
      if (!previousManager) throw new AppError(400, "INVALID_PREVIOUS_MANAGER", "Previous manager is not active in this organization");
      const transfer = await transferCustomerOwnership(transaction, {
        organizationId: request.auth!.organizationId,
        fromManagerId: previousManager.id,
        toManagerId: registration.id
      });
      transferredCustomers = transfer.count;
      await transaction.organizationMembership.update({
        where: { id: previousManager.id },
        data: { isActive: false }
      });
    }
    await transaction.organizationMembership.update({
      where: { id: registration.id },
      data: { isActive: true }
    });
    await transaction.auditEvent.create({
      data: {
        organizationId: request.auth!.organizationId,
        actorId: request.auth!.userId,
        action: "MANAGER_REGISTRATION_APPROVED",
        targetType: "OrganizationMembership",
        targetId: registration.id,
        metadata: { userId: registration.userId, transferFromManagerId: input.transferFromManagerId, transferredCustomers }
      }
    });
    return { transferredCustomers };
  });

  response.json({ status: "approved", membershipId: registration.id, transferredCustomers: result.transferredCustomers });
});

adminRouter.post("/managers/:managerId/transfer", async (request, response) => {
  const input = TransferManagerCustomersSchema.parse(request.body);
  if (request.params.managerId === input.toManagerId) {
    throw new AppError(400, "SAME_MANAGER", "Source and destination manager must be different");
  }
  const managers = await prisma.organizationMembership.findMany({
    where: {
      id: { in: [request.params.managerId, input.toManagerId] },
      organizationId: request.auth!.organizationId,
      isActive: true,
      role: { in: ["REGIONAL_MANAGER", "STORE_MANAGER"] }
    },
    select: { id: true }
  });
  if (managers.length !== 2) throw new AppError(400, "INVALID_MANAGER", "Both managers must be active in this organization");

  const result = await prisma.$transaction(async (transaction) => {
    const transfer = await transferCustomerOwnership(transaction, {
      organizationId: request.auth!.organizationId,
      fromManagerId: request.params.managerId,
      toManagerId: input.toManagerId
    });
    if (input.deactivateSource) {
      await transaction.organizationMembership.update({
        where: { id: request.params.managerId },
        data: { isActive: false }
      });
    }
    await transaction.auditEvent.create({
      data: {
        organizationId: request.auth!.organizationId,
        actorId: request.auth!.membershipId,
        action: "MANAGER_CUSTOMERS_TRANSFERRED",
        targetType: "OrganizationMembership",
        targetId: request.params.managerId,
        metadata: { toManagerId: input.toManagerId, transferredCustomers: transfer.count, deactivated: input.deactivateSource }
      }
    });
    return transfer;
  });
  response.json({ status: "transferred", transferredCustomers: result.count });
});

adminRouter.post("/manager-registrations/:membershipId/reject", async (request, response) => {
  const registration = await prisma.organizationMembership.findFirst({
    where: {
      id: request.params.membershipId,
      organizationId: request.auth!.organizationId,
      isActive: false,
      role: { in: ["REGIONAL_MANAGER", "STORE_MANAGER"] }
    },
    select: { id: true, userId: true, user: { select: { email: true } } }
  });

  if (!registration) {
    throw new AppError(404, "REGISTRATION_NOT_FOUND", "Pending manager registration was not found");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.auditEvent.create({
      data: {
        organizationId: request.auth!.organizationId,
        actorId: request.auth!.userId,
        action: "MANAGER_REGISTRATION_REJECTED",
        targetType: "OrganizationMembership",
        targetId: registration.id,
        metadata: { userId: registration.userId, email: registration.user.email }
      }
    });
    await transaction.organizationMembership.delete({ where: { id: registration.id } });
    await transaction.user.deleteMany({
      where: { id: registration.userId, memberships: { none: {} } }
    });
  });

  response.json({ status: "rejected", membershipId: registration.id });
});
