import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/sri_seva_connect_test";
process.env.JWT_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
process.env.LOG_LEVEL = "silent";

const prismaMock = vi.hoisted(() => ({
  organization: { findUnique: vi.fn() },
  user: { create: vi.fn() }
}));

vi.mock("../db/client.js", () => ({ prisma: prismaMock }));

let app: express.Express;

beforeAll(async () => {
  const [{ authRouter }, { errorHandler }] = await Promise.all([
    import("./router.js"),
    import("../lib/errors.js")
  ]);
  app = express();
  app.use(express.json());
  app.use("/v1/auth", authRouter);
  app.use(errorHandler);
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.organization.findUnique.mockResolvedValue({ id: "404c3836-64c4-4394-8f56-7de5322294d5" });
  prismaMock.user.create.mockResolvedValue({ id: "user-1" });
});

describe("preacher registration", () => {
  it("creates an inactive Preacher membership pending Super Admin approval", async () => {
    const response = await request(app).post("/v1/auth/register").send({
      fullName: "Test Manager",
      email: "Manager@Example.com",
      password: "StrongPassword123!",
      role: "PREACHER"
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({ status: "pending_approval" }));
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "manager@example.com",
        memberships: {
          create: expect.objectContaining({ role: "PREACHER", isActive: false })
        }
      })
    });
  });

  it("does not allow self-registration as Super Admin", async () => {
    const response = await request(app).post("/v1/auth/register").send({
      fullName: "Unauthorized Admin",
      email: "admin@example.com",
      password: "StrongPassword123!",
      role: "SUPER_ADMIN"
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("returns a conflict when the email is already registered", async () => {
    prismaMock.user.create.mockRejectedValueOnce({ code: "P2002" });

    const response = await request(app).post("/v1/auth/register").send({
      fullName: "Existing Manager",
      email: "existing@example.com",
      password: "StrongPassword123!",
      role: "PREACHER"
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ACCOUNT_EXISTS");
  });
});
