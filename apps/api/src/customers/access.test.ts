import { describe, expect, it } from "vitest";
import { customerAccessWhere } from "./access.js";

const baseClaims = {
  userId: "user-1",
  membershipId: "manager-1",
  organizationId: "organization-1"
} as const;

describe("customer access scope", () => {
  it("limits Preachers to assigned or actively shared customers", () => {
    const where = customerAccessWhere({ ...baseClaims, role: "PREACHER" });

    expect(where.organizationId).toBe("organization-1");
    expect(where.deletedAt).toBeNull();
    expect(where.OR).toEqual(expect.arrayContaining([
      { assignedManagerId: "manager-1" },
      expect.objectContaining({ shares: expect.any(Object) })
    ]));
  });

  it("allows super admins to see the tenant without manager filtering", () => {
    const where = customerAccessWhere({ ...baseClaims, role: "SUPER_ADMIN" });

    expect(where).toEqual({ organizationId: "organization-1", deletedAt: null });
  });
});
