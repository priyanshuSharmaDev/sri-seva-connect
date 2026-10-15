import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import { prisma } from "./db/client.js";
import { authRouter } from "./auth/router.js";
import { adminRouter } from "./admin/router.js";
import { customerRouter } from "./customers/router.js";
import { dashboardRouter } from "./dashboard/router.js";
import { errorHandler, notFoundHandler } from "./lib/errors.js";

export const app = express();

app.disable("x-powered-by");
if (env.TRUST_PROXY) app.set("trust proxy", 1);
app.use(helmet());
const allowedOrigins = env.CORS_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length === 0
    ? false
    : (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
  credentials: false
}));
app.use(express.json({ limit: "1mb" }));
app.use(
  pinoHttp({
    level: env.LOG_LEVEL,
    genReqId: (request, response) => {
      const id = request.headers["x-request-id"]?.toString() ?? crypto.randomUUID();
      response.setHeader("x-request-id", id);
      return id;
    },
    redact: ["req.headers.authorization", "req.body.password", "res.headers.set-cookie"]
  })
);

app.get("/", (_request, response) => response.json({ name: "Sri Seva Connect API", version: "0.1.0", status: "ok" }));
app.get("/health/live", (_request, response) => response.json({ status: "ok" }));
app.get("/health/ready", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: "ready" });
  } catch {
    response.status(503).json({ status: "not_ready" });
  }
});
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false
});
app.use("/v1/auth", authRateLimit, authRouter);
app.use("/v1/admin", adminRouter);
app.use("/v1/customers", customerRouter);
app.use("/v1/dashboard", dashboardRouter);
app.use(notFoundHandler);
app.use(errorHandler);
