import type { RequestHandler } from "express";
import { AuthenticationError } from "../../../shared/errors/index.js";
import { verifyAccessToken } from "../../../shared/security/jwt.js";

export const requireAuthentication: RequestHandler = (request, _response, next) => {
  try {
    const token = extractBearerToken(request.headers.authorization);
    const decoded = verifyAccessToken(token);

    request.user = {
      id: decoded.userId,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch {
    next(new AuthenticationError("Missing or invalid authentication token."));
  }
};

function extractBearerToken(authorizationHeader?: string): string {
  if (!authorizationHeader) {
    throw new AuthenticationError("Missing authentication token.");
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AuthenticationError("Invalid authentication token format.");
  }

  return token;
}
