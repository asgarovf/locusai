import { LocusClient, LocusEvent } from "@locusai/sdk";
import { config } from "./config";
import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from "./local-storage";
import { STORAGE_KEYS } from "./local-storage-keys";

// Get initial token from localStorage if available
const initialToken =
  typeof window !== "undefined"
    ? getStorageItem(STORAGE_KEYS.AUTH_TOKEN)
    : null;

export const locusClient = new LocusClient({
  baseUrl: config.NEXT_PUBLIC_API_URL,
  token: initialToken,
});

// Setup event listeners for the web app
if (typeof window !== "undefined") {
  locusClient.emitter.on(LocusEvent.TOKEN_EXPIRED, () => {
    removeStorageItem(STORAGE_KEYS.AUTH_TOKEN);
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
    setStorageItem(STORAGE_KEYS.AUTH_TOKEN, token);
    locusClient.setToken(token);
  } else {
    removeStorageItem(STORAGE_KEYS.AUTH_TOKEN);
    locusClient.setToken(null);
  }
};
