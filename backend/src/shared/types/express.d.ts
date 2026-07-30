import type { UserRole } from "../../modules/users/user.model.js";

export interface AuthenticatedUser {
  id: string;
  userId: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

