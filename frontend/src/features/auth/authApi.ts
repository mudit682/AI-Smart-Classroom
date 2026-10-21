import { isAxiosError } from "axios";
import { apiClient } from "../../lib/http/apiClient";

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
    role: "student" | "teacher" | "admin";
    isVerified: boolean;
  };
}

export interface CurrentUserResponse {
  user: LoginResponse["user"] & {
    createdAt: string;
    updatedAt: string;
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login", { email, password });

  return response.data;
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const response = await apiClient.get<CurrentUserResponse>("/auth/me");

  return response.data;
}

export function clearAccessToken(): void {
  window.localStorage.removeItem("accessToken");
}

export function getLoginErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return error instanceof Error ? error.message : "Login could not be completed.";
}
