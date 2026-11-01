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
  const organization = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: { timezone: true }
  });
  const timezone = organization?.timezone ?? "Asia/Kolkata";
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const today = Object.fromEntries(todayParts.map((part) => [part.type, part.value]));
  const month = Number(today.month);
  const day = Number(today.day);
  const date = `${today.year}-${today.month}-${today.day}`;
  const isToday = (dateOnly: Date | null) =>
    dateOnly !== null && dateOnly.getUTCMonth() + 1 === month && dateOnly.getUTCDate() === day;
  const customerScope = customerAccessWhere(auth);
  const activeCustomerScope = { ...customerScope, status: "ACTIVE" as const };

  const [occasions, customerBirthdays, familyBirthdays, pendingFollowUps, overdue, customerCount, pendingManagerRegistrations] = await Promise.all([
    prisma.occasion.findMany({
      where: {
        organizationId: auth.organizationId,
        deletedAt: null,
        month,
        day,
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
    prisma.customer.findMany({
      where: { ...activeCustomerScope, dateOfBirth: { not: null } },
      select: {
        id: true,
        fullName: true,
        mobileNumber: true,
        dateOfBirth: true,
        allowPhone: true,
        allowWhatsapp: true
      }
    }),
    prisma.familyMember.findMany({
      where: {
        organizationId: auth.organizationId,
        deletedAt: null,
        dateOfBirth: { not: null },
        customer: activeCustomerScope
      },
      select: {
        id: true,
        name: true,
        relationship: true,
        dateOfBirth: true,
        customer: {
          select: { id: true, fullName: true, mobileNumber: true, allowPhone: true, allowWhatsapp: true }
        }
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

  const matchingCustomerBirthdays = customerBirthdays.filter((customer) => isToday(customer.dateOfBirth));
  const matchingFamilyBirthdays = familyBirthdays.filter((member) => isToday(member.dateOfBirth));
  const customerBirthdayIds = new Set(matchingCustomerBirthdays.map((customer) => customer.id));
  const familyBirthdayIds = new Set(matchingFamilyBirthdays.map((member) => member.id));
  const profileBirthdays = [
    ...matchingCustomerBirthdays.map((customer) => ({
      id: `customer-birthday-${customer.id}`,
      kind: "BIRTHDAY",
      title: "Customer birthday",
      visibility: "STANDARD",
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        mobileNumber: customer.mobileNumber,
        allowPhone: customer.allowPhone,
        allowWhatsapp: customer.allowWhatsapp
      },
      familyMember: null
    })),
    ...matchingFamilyBirthdays.map((member) => ({
      id: `family-birthday-${member.id}`,
      kind: "BIRTHDAY",
      title: `${member.relationship.replaceAll("_", " ").toLowerCase()} birthday`,
      visibility: "STANDARD",
      customer: member.customer,
      familyMember: { id: member.id, name: member.name, relationship: member.relationship }
    }))
  ];
  const occasionBirthdays = occasions.filter((item) =>
    item.kind === "BIRTHDAY" &&
    !(item.familyMember ? familyBirthdayIds.has(item.familyMember.id) : customerBirthdayIds.has(item.customer.id))
  );
  const birthdays = [...profileBirthdays, ...occasionBirthdays];
  const familyOccasions = [
    ...occasions.filter((item) =>
      item.familyMember !== null && !(item.kind === "BIRTHDAY" && familyBirthdayIds.has(item.familyMember.id))
    ),
    ...matchingFamilyBirthdays.map((member) => profileBirthdays.find((item) => item.id === `family-birthday-${member.id}`)!)
  ];

  response.json({
    data: {
      date,
      birthdays,
      anniversaries: occasions.filter((item) => item.kind === "WEDDING_ANNIVERSARY"),
      familyOccasions,
      pendingFollowUps,
      overdueReminders: overdue,
      customerCount,
      pendingManagerRegistrations
    }
  });
});
