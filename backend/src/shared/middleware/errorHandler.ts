import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/AppError.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
      code: error.code,
      details: error.details
    });

    return;
  }

  console.error(error);

  response.status(500).json({
    message: "Internal server error",
    code: "INTERNAL_SERVER_ERROR"
  });
};
