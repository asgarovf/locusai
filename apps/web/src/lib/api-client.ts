import { LocusClient, LocusEvent } from "@locusai/sdk";
import { config } from "./config";

const tokenKey = "locus_token";

// Get initial token from localStorage if available
const initialToken =
  typeof window !== "undefined" ? localStorage.getItem(tokenKey) : null;

export const locusClient = new LocusClient({
  baseUrl: config.NEXT_PUBLIC_API_URL,
  token: initialToken,
});

// Setup event listeners for the web app
if (typeof window !== "undefined") {
  locusClient.emitter.on(LocusEvent.TOKEN_EXPIRED, () => {
    localStorage.removeItem(tokenKey);
    // Only redirect if not already on login/register/invite pages
    if (!window.location.pathname.match(/\/(login|register|invite)/)) {
      window.location.href = "/login";
    }
  });

  locusClient.emitter.on(LocusEvent.AUTH_ERROR, (error) => {
    console.error("[Auth Error]", error);
  });

  locusClient.emitter.on(LocusEvent.REQUEST_ERROR, (error) => {
    console.error("[Request Error]", error);
  });
}

/**
 * Helper to update token in client and localStorage
 */
export const setClientToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(tokenKey, token);
    locusClient.setToken(token);
  } else {
    localStorage.removeItem(tokenKey);
    locusClient.setToken(null);
  }
};
