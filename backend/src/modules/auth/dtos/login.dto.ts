import type { UserRole } from "../../users/user.model.js";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
  };
}
