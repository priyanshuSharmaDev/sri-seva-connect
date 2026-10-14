import type { Prisma } from "../generated/prisma/client.js";
import type { AccessClaims } from "../auth/tokens.js";

export function customerAccessWhere(auth: AccessClaims): Prisma.CustomerWhereInput {
  const tenantScope: Prisma.CustomerWhereInput = {
    organizationId: auth.organizationId,
    deletedAt: null
  };
  if (auth.role === "SUPER_ADMIN") return tenantScope;

  return {
    ...tenantScope,
    OR: [
      { assignedManagerId: auth.membershipId },
      {
        shares: {
          some: {
            managerId: auth.membershipId,
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
          }
        }
      }
    ]
  };
}
