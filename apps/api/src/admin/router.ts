import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";
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

adminRouter.post("/manager-registrations/:membershipId/approve", async (request, response) => {
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

  await prisma.$transaction([
    prisma.organizationMembership.update({
      where: { id: registration.id },
      data: { isActive: true }
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: request.auth!.organizationId,
        actorId: request.auth!.userId,
        action: "MANAGER_REGISTRATION_APPROVED",
        targetType: "OrganizationMembership",
        targetId: registration.id,
        metadata: { userId: registration.userId }
      }
    })
  ]);

  response.json({ status: "approved", membershipId: registration.id });
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
