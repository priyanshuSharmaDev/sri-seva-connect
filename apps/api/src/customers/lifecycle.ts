import type { Prisma } from "../generated/prisma/client.js";

type CustomerLifecycleScope = {
  organizationId: string;
  customerId: string;
  assignedManagerId: string;
  actorId: string;
};

async function stopFutureContact(transaction: Prisma.TransactionClient, scope: CustomerLifecycleScope) {
  await transaction.followUpSeries.updateMany({
    where: { organizationId: scope.organizationId, customerId: scope.customerId, active: true },
    data: { active: false }
  });
  await transaction.reminder.updateMany({
    where: { organizationId: scope.organizationId, customerId: scope.customerId, state: { in: ["PENDING", "SNOOZED"] } },
    data: { state: "CANCELLED", version: { increment: 1 } }
  });
}

export async function markCustomerOutOfService(transaction: Prisma.TransactionClient, scope: CustomerLifecycleScope) {
  await stopFutureContact(transaction, scope);
  await transaction.auditEvent.create({
    data: { organizationId: scope.organizationId, actorId: scope.actorId, action: "CUSTOMER_MARKED_OUT_OF_SERVICE", targetType: "Customer", targetId: scope.customerId }
  });
}

export async function softDeleteCustomer(transaction: Prisma.TransactionClient, scope: CustomerLifecycleScope) {
  const deletedAt = new Date();
  await stopFutureContact(transaction, scope);
  await transaction.customer.update({ where: { id: scope.customerId }, data: { deletedAt, version: { increment: 1 } } });
  await transaction.auditEvent.create({
    data: { organizationId: scope.organizationId, actorId: scope.actorId, action: "CUSTOMER_DELETED", targetType: "Customer", targetId: scope.customerId, metadata: { deletedAt: deletedAt.toISOString() } }
  });
  await transaction.syncChange.create({
    data: { organizationId: scope.organizationId, audienceOwnerId: scope.assignedManagerId, entityType: "Customer", entityId: scope.customerId, operation: "DELETE" }
  });
}
