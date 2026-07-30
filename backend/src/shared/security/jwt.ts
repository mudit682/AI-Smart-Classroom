import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { userRoles, type UserRole } from "../../modules/users/user.model.js";

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenPayload extends AccessTokenPayload {
  tokenId: string;
  exp?: number;
  iat?: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"]
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (!isAccessTokenPayload(decoded)) {
    throw new Error("Invalid access token payload.");
  }

  return decoded;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"]
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);

  if (!isRefreshTokenPayload(decoded)) {
    throw new Error("Invalid refresh token payload.");
  }

  return decoded;
}

function isAccessTokenPayload(decoded: unknown): decoded is AccessTokenPayload {
  return (
    typeof decoded === "object" &&
    decoded !== null &&
    "userId" in decoded &&
    "email" in decoded &&
    "role" in decoded &&
    typeof decoded.userId === "string" &&
    typeof decoded.email === "string" &&
    typeof decoded.role === "string" &&
    userRoles.includes(decoded.role as UserRole)
  );
}

function isRefreshTokenPayload(decoded: unknown): decoded is RefreshTokenPayload {
  return isAccessTokenPayload(decoded) && "tokenId" in decoded && typeof decoded.tokenId === "string";
}
