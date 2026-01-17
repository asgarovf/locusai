import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api",
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
