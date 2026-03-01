// Using Expo's built-in .env support (process.env)
// Default server base URL (can be customized in settings)
export const DEFAULT_SERVER_BASE_URL =
  process.env.EXPO_PUBLIC_SERVER_BASE_URL || "http://localhost:8000";

// API Base URL for ecommerce features
export const API_BASE_URL = DEFAULT_SERVER_BASE_URL;

// Google OAuth Client IDs
export const GOOGLE_CLIENT_ID = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
};

// Firebase Configuration (same as web for unified auth)
export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
};

const normalizeBaseUrl = (baseUrl: string) =>
  baseUrl.trim().replace(/\/+$/, "");

// Generate API URLs from base URL
export const getServerUrls = (baseUrl: string) => {
  const normalized = normalizeBaseUrl(baseUrl || DEFAULT_SERVER_BASE_URL);
  return {
    analyze: `${normalized}/analyze`,
    history: `${normalized}/history`,
    historyAll: `${normalized}/history/all`,
    analytics: `${normalized}/analytics/summary`,
    analyticsAll: `${normalized}/analytics/all`,
    autoDataset: `${normalized}/auto-dataset`,
    authRegister: `${normalized}/auth/register`,
    authLogin: `${normalized}/auth/login`,
    authLogout: `${normalized}/auth/logout`,
    authMe: `${normalized}/auth/me`,
  } as const;
};
