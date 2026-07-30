import { AppError } from "./AppError.js";

export class ConflictError extends AppError {
  constructor(message = "Resource conflict", details?: unknown) {
    super(message, 409, {
      code: "CONFLICT_ERROR",
      details
    });
  }
}

