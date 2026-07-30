import type { UserRole } from "../../users/user.model.js";

export interface MeResponse {
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

