import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/sri_seva_connect_test";
process.env.JWT_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
process.env.LOG_LEVEL = "silent";

const prismaMock = vi.hoisted(() => ({
  customer: { findFirst: vi.fn(), update: vi.fn() },
  followUpSeries: { findMany: vi.fn(), updateMany: vi.fn() },
  reminder: { updateMany: vi.fn(), create: vi.fn() },
  familyMember: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn(), create: vi.fn() },
  auditEvent: { create: vi.fn() },
  syncChange: { create: vi.fn() },
  $transaction: vi.fn()
}));

vi.mock("../db/client.js", () => ({ prisma: prismaMock }));

let app: express.Express;
let createAccessToken: typeof import("../auth/tokens.js").createAccessToken;

beforeAll(async () => {
  const [{ customerRouter }, { errorHandler }, tokens] = await Promise.all([
    import("./router.js"),
    import("../lib/errors.js"),
    import("../auth/tokens.js")
  ]);
  createAccessToken = tokens.createAccessToken;
  app = express();
  app.use(express.json());
  app.use("/v1/customers", customerRouter);
  app.use(errorHandler);
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.customer.findFirst.mockResolvedValue({ id: "customer-1" });
  prismaMock.customer.update.mockResolvedValue({
    id: "customer-1",
    fullName: "Updated Customer",
    assignedManagerId: "manager-1"
  });

  prismaMock.followUpSeries.findMany.mockResolvedValue([]);
  prismaMock.familyMember.findMany.mockResolvedValue([]);
  prismaMock.$transaction.mockImplementation(async (operation) => operation(prismaMock));
});

async function authorization(role: "PREACHER" | "SUPER_ADMIN" = "PREACHER") {
  const accessToken = await createAccessToken({
    userId: "user-1",
    membershipId: "manager-1",
    organizationId: "organization-1",
    role
  });
  return `Bearer ${accessToken}`;
}

describe("customer updates", () => {
  it("requires authentication", async () => {
    const response = await request(app).patch("/v1/customers/customer-1").send({ fullName: "Updated Customer" });
    expect(response.status).toBe(401);
  });

  it("prevents a Super Admin from opening an unscoped all-contacts list", async () => {
    const response = await request(app)
      .get("/v1/customers")
      .set("authorization", await authorization("SUPER_ADMIN"));
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("MANAGER_SCOPE_REQUIRED");
  });

  it("updates an accessible customer, clears optional fields, and records sync and audit events", async () => {
    const response = await request(app)
      .patch("/v1/customers/customer-1")
      .set("authorization", await authorization())
      .send({
        fullName: "Updated Customer",
        city: null,
        communicationPreferences: { allowPhone: true, allowWhatsapp: false, allowSms: true },
        contactFrequency: null
      });

    expect(response.status).toBe(200);
    expect(prismaMock.customer.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "customer-1", organizationId: "organization-1" })
    }));
    expect(prismaMock.customer.update).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      data: expect.objectContaining({
        fullName: "Updated Customer",
        city: null,
        allowPhone: true,
        allowWhatsapp: false,
        allowSms: true
      })
    });
    expect(prismaMock.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "CUSTOMER_UPDATED", targetId: "customer-1" })
    });
    expect(prismaMock.syncChange.create).toHaveBeenCalledOnce();
  });

  it("does not update customers outside the caller's access scope", async () => {
    prismaMock.customer.findFirst.mockResolvedValueOnce(null);
    const response = await request(app)
      .patch("/v1/customers/customer-2")
      .set("authorization", await authorization())
      .send({ fullName: "No Access" });

    expect(response.status).toBe(404);
    expect(prismaMock.customer.update).not.toHaveBeenCalled();
  });

  it("creates, updates, and removes family members in the customer update transaction", async () => {
    prismaMock.familyMember.findMany.mockResolvedValue([{ id: "59e960c9-bb24-4576-9f1c-31f828fb19a5" }, { id: "4931d96d-1bb0-4100-833f-1ff2692fb136" }]);
    const response = await request(app)
      .patch("/v1/customers/customer-1")
      .set("authorization", await authorization())
      .send({
        familyMembers: [
          { id: "59e960c9-bb24-4576-9f1c-31f828fb19a5", name: "Updated Spouse", relationship: "SPOUSE", dateOfBirth: "1991-02-03" },
          { name: "New Child", relationship: "DAUGHTER" }
        ]
      });

    expect(response.status).toBe(200);
    expect(prismaMock.familyMember.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: ["4931d96d-1bb0-4100-833f-1ff2692fb136"] } })
    }));
    expect(prismaMock.familyMember.update).toHaveBeenCalledOnce();
    expect(prismaMock.familyMember.create).toHaveBeenCalledOnce();
  });

  it("marks a customer out of service and stops future contact", async () => {
    prismaMock.customer.findFirst.mockResolvedValue({ id: "customer-1", status: "ACTIVE", assignedManagerId: "manager-1" });
    prismaMock.customer.update.mockResolvedValue({ id: "customer-1", status: "OUT_OF_SERVICE", fullName: "Customer", assignedManagerId: "manager-1" });
    const response = await request(app)
      .patch("/v1/customers/customer-1")
      .set("authorization", await authorization())
      .send({ status: "OUT_OF_SERVICE" });

    expect(response.status).toBe(200);
    expect(prismaMock.followUpSeries.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { active: false } }));
    expect(prismaMock.reminder.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { state: "CANCELLED", version: { increment: 1 } } }));
    expect(prismaMock.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "CUSTOMER_MARKED_OUT_OF_SERVICE" }) });
  });

  it("prevents a Preacher from deleting a customer", async () => {
    const response = await request(app)
      .delete("/v1/customers/customer-1")
      .set("authorization", await authorization());

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(prismaMock.customer.update).not.toHaveBeenCalled();
  });

  it("allows a Super Admin to soft delete a customer and emit an offline delete", async () => {
    prismaMock.customer.findFirst.mockResolvedValue({ id: "customer-1", assignedManagerId: "manager-1" });
    const response = await request(app)
      .delete("/v1/customers/customer-1")
      .set("authorization", await authorization("SUPER_ADMIN"));

    expect(response.status).toBe(204);
    expect(prismaMock.customer.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "customer-1" }, data: expect.objectContaining({ deletedAt: expect.any(Date) }) }));
    expect(prismaMock.syncChange.create).toHaveBeenCalledWith({ data: expect.objectContaining({ entityId: "customer-1", operation: "DELETE" }) });
  });
});
