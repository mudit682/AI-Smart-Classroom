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
