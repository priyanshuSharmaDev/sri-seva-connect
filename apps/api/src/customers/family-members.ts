import type { CreateFamilyMemberInput, CustomerFamilyMemberInput } from "@ssc/contracts";
import type { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../lib/errors.js";

export function familyMemberData(input: CreateFamilyMemberInput | CustomerFamilyMemberInput) {
  return {
    name: input.name,
    relationship: input.relationship,
    customRelationship: input.relationship === "CUSTOM" ? input.customRelationship ?? null : null,
    dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null,
    phoneNumber: input.phoneNumber ?? null,
    profession: input.profession ?? null,
    anniversaryDate: input.anniversaryDate ? new Date(`${input.anniversaryDate}T00:00:00.000Z`) : null,
    notes: input.notes ?? null
  };
}

export async function synchronizeFamilyMembers(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  customerId: string,
  members: CustomerFamilyMemberInput[]
) {
  const existing = await transaction.familyMember.findMany({
    where: { organizationId, customerId, deletedAt: null },
    select: { id: true }
  });
  const existingIds = new Set(existing.map(({ id }) => id));
  const submittedIds = members.flatMap((member) => member.id ? [member.id] : []);
  if (new Set(submittedIds).size !== submittedIds.length || submittedIds.some((id) => !existingIds.has(id))) {
    throw new AppError(400, "INVALID_FAMILY_MEMBER", "A family member does not belong to this customer");
  }

  const removedIds = existing.filter(({ id }) => !submittedIds.includes(id)).map(({ id }) => id);
  if (removedIds.length > 0) {
    await transaction.familyMember.updateMany({
      where: { id: { in: removedIds }, organizationId, customerId },
      data: { deletedAt: new Date(), version: { increment: 1 } }
    });
  }

  for (const member of members) {
    if (member.id) {
      await transaction.familyMember.update({
        where: { id: member.id },
        data: { ...familyMemberData(member), version: { increment: 1 } }
      });
    } else {
      await transaction.familyMember.create({
        data: { organizationId, customerId, ...familyMemberData(member) }
      });
    }
  }
}
