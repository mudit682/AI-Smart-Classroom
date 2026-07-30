import type { RequestHandler } from "express";
import { NotFoundError } from "../errors/NotFoundError.js";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new NotFoundError(`Route not found: ${request.method} ${request.originalUrl}`));
};
