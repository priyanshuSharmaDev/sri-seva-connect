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
    update: vi.fn()
  },
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
  prismaMock.organizationMembership.findFirst.mockResolvedValue({ id: "membership-2", userId: "user-2" });
  prismaMock.organizationMembership.update.mockReturnValue({ operation: "approve" });
  prismaMock.auditEvent.create.mockReturnValue({ operation: "audit" });
  prismaMock.$transaction.mockResolvedValue([]);
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

  it("approves a pending manager and writes an audit event", async () => {
    const response = await request(app)
      .post("/v1/admin/manager-registrations/membership-2/approve")
      .set("authorization", await authorization("SUPER_ADMIN"));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "approved", membershipId: "membership-2" });
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "MANAGER_REGISTRATION_APPROVED",
        actorId: "user-1",
        targetId: "membership-2"
      })
    });
  });
});
