import type { UserRole } from "../../users/user.model.js";

export interface CreateTeacherAccountRequest {
  email: string;
  password: string;
}

export interface CreateTeacherAccountResponse {
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
