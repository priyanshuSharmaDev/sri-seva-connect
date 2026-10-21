import express from "express";
import request from "supertest";
import type { Role } from "@ssc/contracts";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/sri_seva_connect_test";
process.env.JWT_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
process.env.LOG_LEVEL = "silent";

const prismaMock = vi.hoisted(() => ({
  organizationMembership: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  customer: { findMany: vi.fn(), updateMany: vi.fn() },
  followUpSeries: { updateMany: vi.fn() },
  reminder: { findMany: vi.fn(), update: vi.fn() },
  syncChange: { createMany: vi.fn() },
  user: { deleteMany: vi.fn() },
  auditEvent: { create: vi.fn() },
  $transaction: vi.fn()
}));

vi.mock("../db/client.js", () => ({ prisma: prismaMock }));

let app: express.Express;
let createAccessToken: typeof import("../auth/tokens.js").createAccessToken;

beforeAll(async () => {
  const [{ adminRouter }, errors, tokens] = await Promise.all([
    import("./router.js"),
    import("../lib/errors.js"),
    import("../auth/tokens.js")
  ]);
  createAccessToken = tokens.createAccessToken;
  app = express();
  app.use(express.json());
  app.use("/v1/admin", adminRouter);
  app.use(errors.errorHandler);
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.organizationMembership.findMany.mockResolvedValue([]);
  prismaMock.organizationMembership.findFirst.mockResolvedValue({ id: "membership-2", userId: "user-2", user: { email: "manager@example.com" } });
  prismaMock.organizationMembership.update.mockReturnValue({ operation: "approve" });
  prismaMock.customer.findMany.mockResolvedValue([]);
  prismaMock.reminder.findMany.mockResolvedValue([]);
  prismaMock.auditEvent.create.mockReturnValue({ operation: "audit" });
  prismaMock.$transaction.mockImplementation(async (operation) => {
    if (typeof operation === "function") return operation(prismaMock);
    return [];
  });
});

async function authorization(role: Role) {
  const accessToken = await createAccessToken({
    userId: "user-1",
    membershipId: "membership-1",
    organizationId: "organization-1",
    role
  });
  return `Bearer ${accessToken}`;
}

describe("manager registration administration", () => {
  it("requires authentication", async () => {
    const response = await request(app).get("/v1/admin/manager-registrations");
    expect(response.status).toBe(401);
  });

  it("prevents managers from viewing pending registrations", async () => {
    const response = await request(app)
      .get("/v1/admin/manager-registrations")
      .set("authorization", await authorization("STORE_MANAGER"));

    expect(response.status).toBe(403);
    expect(prismaMock.organizationMembership.findMany).not.toHaveBeenCalled();
  });

  it("allows a Super Admin to view pending registrations in their organization", async () => {
    const response = await request(app)
      .get("/v1/admin/manager-registrations")
      .set("authorization", await authorization("SUPER_ADMIN"));

    expect(response.status).toBe(200);
    expect(prismaMock.organizationMembership.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "organization-1", isActive: false })
    }));
  });

  it("returns active managers separately without returning their customer records", async () => {
    prismaMock.organizationMembership.findMany.mockResolvedValueOnce([{
      id: "manager-1",
      role: "STORE_MANAGER",
      createdAt: new Date(),
      user: { fullName: "Manager One", email: "manager@example.com" },
      _count: { assignedCustomers: 12 }
    }]);
    const response = await request(app)
      .get("/v1/admin/managers")
      .set("authorization", await authorization("SUPER_ADMIN"));

    expect(response.status).toBe(200);
    expect(response.body.managers[0]._count.assignedCustomers).toBe(12);
    expect(response.body.managers[0].customers).toBeUndefined();
  });

  it("approves a pending manager and writes an audit event", async () => {
    const response = await request(app)
      .post("/v1/admin/manager-registrations/membership-2/approve")
      .set("authorization", await authorization("SUPER_ADMIN"));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "approved", membershipId: "membership-2", transferredCustomers: 0 });
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "MANAGER_REGISTRATION_APPROVED",
        actorId: "user-1",
        targetId: "membership-2"
      })
    });
  });

  it("approves a replacement manager and transfers all previous manager contacts", async () => {
    prismaMock.organizationMembership.findFirst
      .mockResolvedValueOnce({ id: "membership-2", userId: "user-2", user: { email: "new@example.com" } })
      .mockResolvedValueOnce({ id: "membership-old" });
    prismaMock.customer.findMany.mockResolvedValue([
      { id: "customer-1", assignedManagerId: "membership-old" },
      { id: "customer-2", assignedManagerId: "membership-old" }
    ]);

    const response = await request(app)
      .post("/v1/admin/manager-registrations/membership-2/approve")
      .set("authorization", await authorization("SUPER_ADMIN"))
      .send({ transferFromManagerId: "9cc434a8-99db-4ffc-b2a4-a33160112d55" });

    expect(response.status).toBe(200);
    expect(response.body.transferredCustomers).toBe(2);
    expect(prismaMock.customer.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ assignedManagerId: "membership-2" })
    }));
    expect(prismaMock.followUpSeries.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { managerId: "membership-2" }
    }));
    expect(prismaMock.organizationMembership.update).toHaveBeenCalledWith({
      where: { id: "membership-old" },
      data: { isActive: false }
    });
    expect(prismaMock.syncChange.createMany).toHaveBeenCalledOnce();
  });

  it("rejects a pending manager, records an audit event, and removes the pending account", async () => {
    const response = await request(app)
      .post("/v1/admin/manager-registrations/membership-2/reject")
      .set("authorization", await authorization("SUPER_ADMIN"));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "rejected", membershipId: "membership-2" });
    expect(prismaMock.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "MANAGER_REGISTRATION_REJECTED",
        actorId: "user-1",
        targetId: "membership-2"
      })
    });
    expect(prismaMock.organizationMembership.delete).toHaveBeenCalledWith({ where: { id: "membership-2" } });
    expect(prismaMock.user.deleteMany).toHaveBeenCalledOnce();
  });
});
