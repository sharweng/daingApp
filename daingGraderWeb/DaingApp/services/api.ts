import axios from "axios";
import type { FishType, Condition, HistoryEntry } from "../types";

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, "");

export const analyzeFish = async (
  imageUri: string,
  serverUrl: string,
): Promise<string> => {
  const formData = new FormData();
  // @ts-ignore: React Native FormData requires these specific fields
  formData.append("file", {
    uri: imageUri,
    name: "fish.jpg",
    type: "image/jpeg",
  });

  try {
    const response = await axios.post(serverUrl, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      responseType: "blob",
      timeout: 10000, // 10 seconds timeout
    });

    // Convert Blob to Viewable Image
    return new Promise((resolve, reject) => {
      const fileReaderInstance = new FileReader();
      fileReaderInstance.readAsDataURL(response.data);
      fileReaderInstance.onload = () => {
        if (typeof fileReaderInstance.result === "string") {
          resolve(fileReaderInstance.result);
        } else {
          reject(new Error("Failed to convert image"));
        }
      };
      fileReaderInstance.onerror = () =>
        reject(new Error("Failed to read image"));
    });
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

export const uploadDataset = async (
  imageUri: string,
  fishType: FishType,
  condition: Condition,
  uploadUrl: string,
): Promise<{ success: boolean; message: string; error?: string }> => {
  const formData = new FormData();
  // @ts-ignore: React Native FormData requires these specific fields
  formData.append("file", {
    uri: imageUri,
    name: `${fishType}_${condition}_${Date.now()}.jpg`,
    type: "image/jpeg",
  });
  formData.append("fish_type", fishType);
  formData.append("condition", condition);

  try {
    const response = await axios.post(uploadUrl, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 10000, // 10 seconds timeout
    });

    // Check if backend returned success status
    if (response.data.status === "success") {
      return {
        success: true,
        message: "Image uploaded to Cloudinary successfully!",
      };
    } else if (response.data.status === "error") {
      return {
        success: false,
        message: "Upload failed",
        error: response.data.message || "Unknown error occurred",
      };
    } else {
      return {
        success: false,
        message: "Upload failed",
        error: "Unexpected response from server",
      };
    }
  } catch (error: any) {
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      return {
        success: false,
        message: "Request timed out",
        error: "Connection timed out. Please check your server IP address.",
      };
    } else if (
      error.code === "ERR_NETWORK" ||
      error.message?.includes("Network Error")
    ) {
      return {
        success: false,
        message: "Cannot connect to server",
        error:
          "Unable to reach server. Please verify the IP address is correct.",
      };
    } else {
      return {
        success: false,
        message: "Network error",
        error: error.message || "Failed to connect to server",
      };
    }
  }
};

export const fetchHistory = async (
  historyUrl: string,
): Promise<HistoryEntry[]> => {
  try {
    const response = await axios.get(normalizeUrl(historyUrl), {
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
    timeout: 10000, // 10 seconds timeout
  });
};
