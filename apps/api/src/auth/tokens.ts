import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@ssc/contracts";
import { env } from "../config/env.js";

export type AccessClaims = {
  userId: string;
  membershipId: string;
  organizationId: string;
  role: Role;
};

const secret = new TextEncoder().encode(env.JWT_SECRET);

function ttlToSeconds(value: string): number {
  const match = /^(\d+)([mhd])$/.exec(value);
  if (!match) throw new Error("ACCESS_TOKEN_TTL must use m, h, or d units");
  const amount = Number(match[1]);
  const unit = match[2];
  return amount * (unit === "m" ? 60 : unit === "h" ? 3600 : 86400);
}

export async function createAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlToSeconds(env.ACCESS_TOKEN_TTL))
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  });
  const { userId, membershipId, organizationId, role } = payload as Partial<AccessClaims>;
  if (!userId || !membershipId || !organizationId || !role) throw new Error("Invalid token claims");
  return { userId, membershipId, organizationId, role };
}
