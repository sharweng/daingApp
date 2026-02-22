import axios from "axios";
import type {
  HistoryEntry,
  AnalyticsSummary,
  AnalysisScanResult,
  AuthResponse,
  User,
} from "../types";

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, "");

// Auth token storage (will be set by AuthContext)
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

// Helper to get auth headers
const getAuthHeaders = () => {
  if (authToken) {
    return { Authorization: `Bearer ${authToken}` };
  }
  return {};
};

// Retry helper for network requests
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000,
): Promise<T> => {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Only retry on network errors, not on server errors
      if (
        error.code === "ERR_NETWORK" ||
        error.code === "ECONNABORTED" ||
        error.message?.includes("Network Error") ||
        error.message?.includes("timeout")
      ) {
        if (i < retries - 1) {
          console.log(`Retry ${i + 1}/${retries} after ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
      throw error;
    }
  }
  throw lastError;
};

export const analyzeFish = async (
  imageUri: string,
  serverUrl: string,
  autoSaveDataset: boolean = false,
  confidenceThreshold: number = 0.7,
  hideColorOverlay: boolean = true,
): Promise<AnalysisScanResult> => {
  const formData = new FormData();
  // @ts-ignore: React Native FormData requires these specific fields
  formData.append("file", {
    uri: imageUri,
    name: "fish.jpg",
    type: "image/jpeg",
  });

  // Build query params
  const params = new URLSearchParams();
  if (autoSaveDataset) params.append("auto_save_dataset", "true");
  params.append("confidence_threshold", confidenceThreshold.toString());
  params.append("hide_color_overlay", hideColorOverlay ? "true" : "false");
  const urlWithParams = `${serverUrl}?${params.toString()}`;

  try {
    const response = await withRetry(
      () =>
        axios.post<AnalysisScanResult>(urlWithParams, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            ...getAuthHeaders(),
          },
          timeout: 30000,
        }),
      3,
      1000,
    );

    return response.data;
  } catch (error: any) {
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw new Error(
        "Request timed out. Please check your server IP address and try again.",
      );
    } else if (
      error.code === "ERR_NETWORK" ||
      error.message?.includes("Network Error")
    ) {
      throw new Error(
        "Cannot connect to server. Please verify the IP address is correct.",
      );
    } else {
      throw new Error(error.message || "Failed to analyze image");
    }
  }
};

export const fetchHistory = async (
  historyUrl: string,
): Promise<HistoryEntry[]> => {
  try {
    const response = await axios.get(normalizeUrl(historyUrl), {
      headers: getAuthHeaders(),
      timeout: 10000, // 10 seconds timeout
    });
    const entries = response.data?.entries;
    if (Array.isArray(entries)) {
      return entries as HistoryEntry[];
    }
    return [];
  } catch (error: any) {
    // Silently return empty array - don't trigger Expo error overlay
    return [];
  }
};

export const deleteHistoryEntry = async (
  historyUrl: string,
  entryId: string,
): Promise<void> => {
  const base = normalizeUrl(historyUrl);
  const encodedId = encodeURIComponent(entryId);
  await axios.delete(`${base}/${encodedId}`, {
    headers: getAuthHeaders(),
    timeout: 10000, // 10 seconds timeout
  });
};

export const fetchAnalytics = async (
  analyticsUrl: string,
  days: number = 7,
): Promise<AnalyticsSummary> => {
  try {
    const url = `${normalizeUrl(analyticsUrl)}?days=${days}`;
    const response = await axios.get<AnalyticsSummary>(url, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    // Return empty analytics on error
    return {
      status: "error",
      total_scans: 0,
      daing_scans: 0,
      non_daing_scans: 0,
      fish_type_distribution: {},
      average_confidence: {},
      daily_scans: {},
      color_consistency: {
        average_score: 0,
        grade_distribution: { Export: 0, Local: 0, Reject: 0 },
        by_fish_type: {},
      },
    };
  }
};

export const fetchAutoDataset = async (
  autoDatasetUrl: string,
): Promise<HistoryEntry[]> => {
  try {
    const response = await axios.get(normalizeUrl(autoDatasetUrl), {
      timeout: 10000,
    });
    const entries = response.data?.entries;
    if (Array.isArray(entries)) {
      return entries as HistoryEntry[];
    }
    return [];
  } catch (error: any) {
    return [];
  }
};

export const deleteAutoDatasetEntry = async (
  autoDatasetUrl: string,
  entryId: string,
): Promise<void> => {
  const base = normalizeUrl(autoDatasetUrl);
  const encodedId = encodeURIComponent(entryId);
  await axios.delete(`${base}/${encodedId}`, {
    timeout: 10000,
  });
};

// ============================================
// AUTHENTICATION API
// ============================================

export const registerUser = async (
  baseUrl: string,
  username: string,
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const formData = new FormData();
  formData.append("username", username);
  formData.append("email", email);
  formData.append("password", password);

  try {
    const response = await axios.post<AuthResponse>(
      `${normalizeUrl(baseUrl)}/auth/register`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 10000,
      },
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      return { status: "error", message: error.response.data.detail };
    }
    return { status: "error", message: error.message || "Registration failed" };
  }
};

export const loginUser = async (
  baseUrl: string,
  username: string,
  password: string,
): Promise<AuthResponse> => {
  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);

  try {
    const response = await axios.post<AuthResponse>(
      `${normalizeUrl(baseUrl)}/auth/login`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 10000,
      },
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      return { status: "error", message: error.response.data.detail };
    }
    return { status: "error", message: error.message || "Login failed" };
  }
};

export const googleSignIn = async (
  baseUrl: string,
  accessToken?: string,
  idToken?: string,
): Promise<AuthResponse> => {
  try {
    const response = await axios.post<AuthResponse>(
      `${normalizeUrl(baseUrl)}/auth/google-signin`,
      {
        access_token: accessToken,
        id_token: idToken,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      return { status: "error", message: error.response.data.detail };
    }
    return { status: "error", message: error.message || "Google sign-in failed" };
  }
};

export const logoutUser = async (baseUrl: string): Promise<AuthResponse> => {
  try {
    const response = await axios.post<AuthResponse>(
      `${normalizeUrl(baseUrl)}/auth/logout`,
      null,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data;
  } catch (error: any) {
    return { status: "error", message: error.message || "Logout failed" };
  }
};

export const getCurrentUser = async (
  baseUrl: string,
): Promise<AuthResponse> => {
  try {
    const response = await axios.get<AuthResponse>(
      `${normalizeUrl(baseUrl)}/auth/me`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data;
  } catch (error: any) {
    return { status: "error", message: "Not authenticated" };
  }
};

export const fetchAllHistory = async (
  baseUrl: string,
): Promise<HistoryEntry[]> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/history/all`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    const entries = response.data?.entries;
    if (Array.isArray(entries)) {
      return entries as HistoryEntry[];
    }
    return [];
  } catch (error: any) {
    return [];
  }
};

export const fetchAllAnalytics = async (
  baseUrl: string,
  days: number = 7,
): Promise<AnalyticsSummary> => {
  try {
    const response = await axios.get<AnalyticsSummary>(
      `${normalizeUrl(baseUrl)}/analytics/all?days=${days}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data;
  } catch (error: any) {
    return {
      status: "error",
      total_scans: 0,
      daing_scans: 0,
      non_daing_scans: 0,
      fish_type_distribution: {},
      average_confidence: {},
      daily_scans: {},
      color_consistency: {
        average_score: 0,
        grade_distribution: { Export: 0, Local: 0, Reject: 0 },
        by_fish_type: {},
      },
    };
  }
};
