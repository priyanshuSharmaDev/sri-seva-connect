import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { compare, hash } from "bcryptjs";
import { LoginSchema, RegisterManagerSchema } from "@ssc/contracts";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../db/client.js";
import { AppError } from "../lib/errors.js";
import { createAccessToken, type AccessClaims } from "./tokens.js";

export const authRouter = Router();

const RefreshSchema = z.object({ refreshToken: z.string().min(40).max(200) });

function isUniqueConstraintError(error: unknown): error is { code: "P2002" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueSession(userId: string, membershipId: string, claims: AccessClaims) {
  const accessToken = await createAccessToken(claims);
  const refreshToken = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86_400_000);
  await prisma.refreshSession.create({
    data: { userId, membershipId, tokenHash: hashToken(refreshToken), expiresAt }
  });
  return { accessToken, refreshToken, expiresIn: env.ACCESS_TOKEN_TTL };
}

authRouter.post("/register", async (request, response) => {
  const input = RegisterManagerSchema.parse(request.body);
  const email = input.email.toLowerCase();
  const organization = await prisma.organization.findUnique({ where: { id: env.ORGANIZATION_ID } });

  if (!organization) {
    throw new AppError(503, "REGISTRATION_NOT_READY", "Preacher registration is not available yet");
  }

  try {
    const passwordHash = await hash(input.password, 12);
    await prisma.user.create({
      data: {
        email,
        fullName: input.fullName,
        passwordHash,
        memberships: {
          create: {
            organizationId: organization.id,
            role: input.role,
            isActive: false
          }
        }
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(409, "ACCOUNT_EXISTS", "An account with this email already exists");
    }
    throw error;
  }

  response.status(201).json({
    status: "pending_approval",
    message: "Your account is awaiting Super Admin approval"
  });
});

authRouter.post("/login", async (request, response) => {
  const input = LoginSchema.parse(request.body);
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: {
      memberships: {
        where: { isActive: true },
        include: { organization: true },
        take: 1
      }
    }
  });

  const membership = user?.memberships[0];
  if (!user || !membership || !(await compare(input.password, user.passwordHash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }

  const claims: AccessClaims = {
    userId: user.id,
    membershipId: membership.id,
    organizationId: membership.organizationId,
    role: membership.role
  };
  const tokens = await issueSession(user.id, membership.id, claims);

  response.json({
    ...tokens,
    user: { id: user.id, fullName: user.fullName, email: user.email },
    membership: {
      id: membership.id,
      role: membership.role,
      organization: { id: membership.organization.id, name: membership.organization.name }
    }
  });
});

authRouter.post("/refresh", async (request, response) => {
  const input = RefreshSchema.parse(request.body);
  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash: hashToken(input.refreshToken) },
    include: { membership: true }
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.membership.isActive) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }

  const claims: AccessClaims = {
    userId: session.userId,
    membershipId: session.membershipId,
    organizationId: session.membership.organizationId,
    role: session.membership.role
  };
  const nextRefreshToken = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86_400_000);
  const accessToken = await createAccessToken(claims);

  await prisma.$transaction([
    prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
    prisma.refreshSession.create({
      data: {
        userId: session.userId,
        membershipId: session.membershipId,
        tokenHash: hashToken(nextRefreshToken),
        expiresAt
      }
    })
  ]);

  response.json({ accessToken, refreshToken: nextRefreshToken, expiresIn: env.ACCESS_TOKEN_TTL });
});

authRouter.post("/logout", async (request, response) => {
  const input = RefreshSchema.parse(request.body);
  await prisma.refreshSession.updateMany({
    where: { tokenHash: hashToken(input.refreshToken), revokedAt: null },
    data: { revokedAt: new Date() }
  });
  response.status(204).send();
});
