// Default server base URL (can be customized in settings)
export const DEFAULT_SERVER_BASE_URL = "http://192.168.1.114:8000"; //http://192.168.1.114:8000

// API Base URL for ecommerce features
export const API_BASE_URL = DEFAULT_SERVER_BASE_URL;

// Google OAuth Client IDs (from Firebase Console → Authentication → Sign-in method → Google)
// The Web Client ID is shown when you enable Google sign-in in Firebase
// It looks like: XXXXXXXXX-XXXXXXXX.apps.googleusercontent.com
export const GOOGLE_CLIENT_ID = {
  // Get this from: Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration → Web client ID
  webClientId:
    "1086621509748-507rcjefn14ng4sc3mtjlsgj8o6ju2o9.apps.googleusercontent.com",
};

// Firebase Configuration (same as web for unified auth)
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCsdSxrDeN0Z9QDycW5VpcluxSlEH6qaxc",
  authDomain: "dainggrader-auth.firebaseapp.com",
  projectId: "dainggrader-auth",
  storageBucket: "dainggrader-auth.firebasestorage.app",
  messagingSenderId: "1086621509748",
  appId: "1:1086621509748:web:380a81b3b561690e920921",
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
