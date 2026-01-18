import axios from "axios";

// In dev mode, API runs on port 3080. In production (static export), relative paths work.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3080/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // We can add global error handling here (e.g., logging, toast notifications)
    const message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred";
    console.error(`[API Error] ${message}`, error);
    return Promise.reject(error);
  }
);

export default apiClient;
