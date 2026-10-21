import type { ContactFrequency } from "@ssc/contracts";
import { buildReminderDedupeKey, followUpIntervalMinutes, nextFollowUpAt } from "@ssc/domain";
import type { Prisma } from "../generated/prisma/client.js";

type FollowUpOwner = {
  organizationId: string;
  customerId: string;
  customerName: string;
  managerId: string;
};

export async function scheduleContactFrequency(
  transaction: Prisma.TransactionClient,
  owner: FollowUpOwner,
  frequency: ContactFrequency
) {
  const customIntervalMinutes = frequency.cadence === "CUSTOM"
    ? followUpIntervalMinutes("CUSTOM", frequency.intervalDays)
    : null;
  const nextOccurrenceAt = nextFollowUpAt(
    frequency.cadence,
    new Date(),
    frequency.cadence === "CUSTOM" ? frequency.intervalDays : undefined
  );
  const series = await transaction.followUpSeries.create({
    data: {
      organizationId: owner.organizationId,
      customerId: owner.customerId,
      managerId: owner.managerId,
      cadence: frequency.cadence,
      customIntervalMinutes,
      nextOccurrenceAt
    }
  });
  const occurrenceDate = nextOccurrenceAt.toISOString().slice(0, 10);
  await transaction.reminder.create({
    data: {
      organizationId: owner.organizationId,
      customerId: owner.customerId,
      ownerId: owner.managerId,
      sourceType: "FOLLOW_UP",
      sourceId: series.id,
      occurrenceDate: new Date(`${occurrenceDate}T00:00:00.000Z`),
      offsetMinutes: 0,
      originalDueAt: nextOccurrenceAt,
      dueAt: nextOccurrenceAt,
      title: `Contact ${owner.customerName}`,
      dedupeKey: buildReminderDedupeKey({
        organizationId: owner.organizationId,
        sourceType: "FOLLOW_UP",
        sourceId: series.id,
        occurrenceDate,
        offsetMinutes: 0,
        ownerId: owner.managerId
      })
    }
  });
}

export async function replaceContactFrequency(
  transaction: Prisma.TransactionClient,
  owner: FollowUpOwner,
  frequency: ContactFrequency | null
) {
  const current = await transaction.followUpSeries.findMany({
    where: { organizationId: owner.organizationId, customerId: owner.customerId, active: true },
    select: { id: true }
  });
  const sourceIds = current.map(({ id }) => id);
  if (sourceIds.length > 0) {
    await transaction.followUpSeries.updateMany({
      where: { id: { in: sourceIds } },
      data: { active: false }
    });
    await transaction.reminder.updateMany({
      where: { sourceType: "FOLLOW_UP", sourceId: { in: sourceIds }, state: { in: ["PENDING", "SNOOZED"] } },
      data: { state: "CANCELLED", version: { increment: 1 } }
    });
  }
  if (frequency) await scheduleContactFrequency(transaction, owner, frequency);
}
