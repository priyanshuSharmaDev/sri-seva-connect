import { buildReminderDedupeKey } from "@ssc/domain";
import type { Prisma } from "../generated/prisma/client.js";

type TransferScope = {
  organizationId: string;
  toManagerId: string;
  customerId?: string;
  customerIds?: string[];
  fromManagerId?: string;
};

export async function transferCustomerOwnership(transaction: Prisma.TransactionClient, scope: TransferScope) {
  const customers = await transaction.customer.findMany({
    where: {
      organizationId: scope.organizationId,
      deletedAt: null,
      ...(scope.customerId && { id: scope.customerId }),
      ...(scope.customerIds && { id: { in: [...new Set(scope.customerIds)] } }),
      ...(scope.fromManagerId && { assignedManagerId: scope.fromManagerId })
    },
    select: { id: true, assignedManagerId: true }
  });
  if (customers.length === 0) return { count: 0, customerIds: [] as string[] };

  const customerIds = customers.map(({ id }) => id);
  await transaction.customer.updateMany({
    where: { id: { in: customerIds }, organizationId: scope.organizationId },
    data: { assignedManagerId: scope.toManagerId, version: { increment: 1 } }
  });
  await transaction.followUpSeries.updateMany({
    where: { organizationId: scope.organizationId, customerId: { in: customerIds }, active: true },
    data: { managerId: scope.toManagerId }
  });

  const futureReminders = await transaction.reminder.findMany({
    where: {
      customerId: { in: customerIds },
      organizationId: scope.organizationId,
      state: { in: ["PENDING", "SNOOZED"] },
      dueAt: { gt: new Date() }
    },
    select: { id: true, sourceType: true, sourceId: true, occurrenceDate: true, offsetMinutes: true }
  });
  for (const reminder of futureReminders) {
    const occurrenceDate = reminder.occurrenceDate.toISOString().slice(0, 10);
    await transaction.reminder.update({
      where: { id: reminder.id },
      data: {
        ownerId: scope.toManagerId,
        dedupeKey: buildReminderDedupeKey({
          organizationId: scope.organizationId,
          sourceType: reminder.sourceType,
          sourceId: reminder.sourceId,
          occurrenceDate,
          offsetMinutes: reminder.offsetMinutes,
          ownerId: scope.toManagerId
        }),
        version: { increment: 1 }
      }
    });
  }

  await transaction.syncChange.createMany({
    data: customers.flatMap((customer) => [
      {
        organizationId: scope.organizationId,
        audienceOwnerId: customer.assignedManagerId,
        entityType: "Customer",
        entityId: customer.id,
        operation: "DELETE"
      },
      {
        organizationId: scope.organizationId,
        audienceOwnerId: scope.toManagerId,
        entityType: "Customer",
        entityId: customer.id,
        operation: "UPSERT"
      }
    ])
  });

  return { count: customers.length, customerIds };
}
