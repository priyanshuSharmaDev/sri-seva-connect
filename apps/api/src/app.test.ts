import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/sri_seva_connect_test";
process.env.JWT_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
process.env.LOG_LEVEL = "silent";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const { app } = await import("./app.js");
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind to TCP");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  const { prisma } = await import("./db/client.js");
  await prisma.$disconnect();
});

describe("service endpoints", () => {
  it("reports process liveness without exposing internals", async () => {
    const response = await fetch(`${baseUrl}/health/live`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("returns service metadata at the root", async () => {
    const response = await fetch(baseUrl);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      name: "Sri Seva Connect API",
      version: "0.1.0",
      status: "ok"
    });
  });
});
