import type { UserRole } from "../../users/user.model.js";

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface RegisterResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

