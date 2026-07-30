import { AppError } from "./AppError.js";

export class AuthenticationError extends AppError {
  constructor(message = "Authentication failed") {
    super(message, 401, {
      code: "AUTHENTICATION_ERROR"
    });
  }
}

