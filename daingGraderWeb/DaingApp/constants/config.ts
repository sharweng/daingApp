// Default server base URL (can be customized in settings)
export const DEFAULT_SERVER_BASE_URL = "http://192.168.1.8:8000";

const normalizeBaseUrl = (baseUrl: string) =>
  baseUrl.trim().replace(/\/+$/, "");

// Generate API URLs from base URL
export const getServerUrls = (baseUrl: string) => {
  const normalized = normalizeBaseUrl(baseUrl || DEFAULT_SERVER_BASE_URL);
  return {
    analyze: `${normalized}/analyze`,
    uploadDataset: `${normalized}/upload-dataset`,
    history: `${normalized}/history`,
  } as const;
};

// Fish types available in the app
export const FISH_TYPES = [
  "danggit",
  "galunggong",
  "espada",
  "bangus",
  "pusit",
] as const;

// Condition options for data gathering
export const CONDITIONS = [
  { label: "Local", value: "local_quality" },
  { label: "Export", value: "export_quality" },
  { label: "Moldy", value: "moldy" },
  { label: "Fresh", value: "fresh" },
] as const;
