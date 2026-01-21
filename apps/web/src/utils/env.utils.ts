/**
 * Environment Utility Functions
 */

export const isLocalMode = () => {
  return process.env.NEXT_PUBLIC_LOCUS_MODE === "local";
};

export const isCloudMode = () => {
  return process.env.NEXT_PUBLIC_LOCUS_MODE === "cloud";
};

export const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3080/api";
};
