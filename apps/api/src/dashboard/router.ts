import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db/client.js";
import { AppError } from "../lib/errors.js";
import { customerAccessWhere } from "../customers/access.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/today", async (request, response) => {
  const auth = request.auth;
  if (!auth) throw new AppError(401, "AUTH_REQUIRED", "Authentication is required");
  const now = new Date();
  const customerScope = customerAccessWhere(auth);
  const activeCustomerScope = { ...customerScope, status: "ACTIVE" as const };

  const [occasions, pendingFollowUps, overdue, customerCount, pendingManagerRegistrations] = await Promise.all([
    prisma.occasion.findMany({
      where: {
        organizationId: auth.organizationId,
        deletedAt: null,
        month: now.getUTCMonth() + 1,
        day: now.getUTCDate(),
        customer: activeCustomerScope,
        ...(auth.role === "SUPER_ADMIN"
          ? {}
          : { OR: [{ visibility: "STANDARD" }, { customer: { assignedManagerId: auth.membershipId } }] })
      },
      select: {
        id: true,
        kind: true,
        title: true,
        visibility: true,
        customer: { select: { id: true, fullName: true, mobileNumber: true, allowPhone: true, allowWhatsapp: true } },
        familyMember: { select: { id: true, name: true, relationship: true } }
      }
    }),
    prisma.reminder.count({
      where: { organizationId: auth.organizationId, ownerId: auth.membershipId, sourceType: "FOLLOW_UP", state: { in: ["PENDING", "SNOOZED"] }, dueAt: { gte: now } }
    }),
    prisma.reminder.count({
      where: { organizationId: auth.organizationId, ownerId: auth.membershipId, state: { in: ["PENDING", "SNOOZED"] }, dueAt: { lt: now } }
    }),
    prisma.customer.count({ where: customerScope }),
    auth.role === "SUPER_ADMIN"
      ? prisma.organizationMembership.count({
          where: {
            organizationId: auth.organizationId,
            isActive: false,
            role: "PREACHER"
          }
        })
      : Promise.resolve(0)
  ]);

  response.json({
    data: {
      date: now.toISOString().slice(0, 10),
      birthdays: occasions.filter((item) => item.kind === "BIRTHDAY"),
      anniversaries: occasions.filter((item) => item.kind === "WEDDING_ANNIVERSARY"),
      familyOccasions: occasions.filter((item) => item.familyMember !== null),
      pendingFollowUps,
      overdueReminders: overdue,
      customerCount,
      pendingManagerRegistrations
    }
  });
});
