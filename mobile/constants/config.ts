// Default server base URL (can be customized in settings)
export const DEFAULT_SERVER_BASE_URL =
  "https://presenting-url-geneva-powerful.trycloudflare.com"; //http://192.168.1.109:8000

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
