import axios from "axios";
import { env } from "../../config/env";

export const apiClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: 15000
});

apiClient.interceptors.request.use((config) => {
  const accessToken = window.localStorage.getItem("accessToken");

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.localStorage.removeItem("accessToken");

      if (window.location.pathname !== "/teacher/login") {
        window.location.assign("/teacher/login");
      }
    }

    return Promise.reject(error);
  }
);
