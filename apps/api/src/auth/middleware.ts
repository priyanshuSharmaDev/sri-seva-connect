import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { verifyAccessToken } from "./tokens.js";

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const authorization = request.header("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError(401, "AUTH_REQUIRED", "Authentication is required");
    }
    request.auth = await verifyAccessToken(authorization.slice(7));
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, "INVALID_TOKEN", "Access token is invalid or expired"));
  }
}
