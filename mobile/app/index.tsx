import { useState, useRef, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { commonStyles, theme } from "../styles/common";
import { HomeScreen } from "../components/HomeScreen";
import { ScanScreen } from "../components/ScanScreen";
import { AnalyticsScreen } from "../components/AnalyticsScreen";
import { HistoryScreen } from "../components/HistoryScreen";
import { AutoDatasetScreen } from "../components/AutoDatasetScreen";
import { SettingsModal } from "../components/SettingsModal";
import { LoginScreen } from "../components/LoginScreen";
import { RegisterScreen } from "../components/RegisterScreen";
import { takePicture } from "../utils/camera";
import { analyzeFish, fetchHistory } from "../services/api";
import { DEFAULT_SERVER_BASE_URL, getServerUrls } from "../constants/config";
import { useAuth } from "../contexts/AuthContext";
import type { Screen, HistoryEntry, AnalysisScanResult } from "../types";

export default function Index() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Auth
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    logout,
    restoreSession,
  } = useAuth();

  // Navigation & Settings
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [showSettings, setShowSettings] = useState(false);
  const [autoSaveDataset, setAutoSaveDataset] = useState(false);
  const [serverBaseUrl, setServerBaseUrl] = useState(DEFAULT_SERVER_BASE_URL);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [hideColorOverlay, setHideColorOverlay] = useState(true);
  const serverUrls = useMemo(
    () => getServerUrls(serverBaseUrl),
    [serverBaseUrl],
  );

  // History state
  const [latestHistoryEntry, setLatestHistoryEntry] =
    useState<HistoryEntry | null>(null);
  const [viewingFromScan, setViewingFromScan] = useState(false);

  // Restore auth session on app start
  useEffect(() => {
    restoreSession(serverBaseUrl);
  }, []);

  // When server URL changes, re-validate session
  useEffect(() => {
    if (isAuthenticated) {
      restoreSession(serverBaseUrl);
    }
  }, [serverBaseUrl]);

  // Fetch latest history entry for thumbnail
  useEffect(() => {
    const loadLatestHistory = async () => {
      try {
        const entries = await fetchHistory(serverUrls.history);
        if (entries.length > 0) {
          setLatestHistoryEntry(entries[0]);
        }
      } catch (error) {
        // Silently fail - thumbnail is optional
      }
    };
    loadLatestHistory();
  }, [serverUrls.history, analysisResult]); // Refresh when new analysis is done

  // Handle logout
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout(serverBaseUrl);
          setCurrentScreen("home");
        },
      },
    ]);
  };

  // Show loading screen while restoring auth
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Check camera permissions
  if (!permission) return <View />;
  if (!permission.granted && currentScreen === "scan") {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconContainer}>
            <Ionicons
              name="camera-outline"
              size={48}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            To scan and analyze fish, please allow access to your camera.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============================================
  // HANDLERS
  // ============================================

  const handleTakePicture = async () => {
    const uri = await takePicture(cameraRef);
    if (uri) {
      setCapturedImage(uri);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request media library permissions first (required for Android APK)
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant gallery access to select images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image from gallery");
    }
  };

  const handleAnalyzeFish = async () => {
    if (!capturedImage) return;
    setLoading(true);

    try {
      const result = await analyzeFish(
        capturedImage,
        serverUrls.analyze,
        autoSaveDataset,
        confidenceThreshold,
        hideColorOverlay,
      );
      setAnalysisResult(result);
    } catch (error) {
      Alert.alert(
        "Connection Failed",
        `Make sure your server URL is correct.\nCurrent Target: ${serverBaseUrl}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setLoading(false);
  };

  const handleViewHistoryImage = () => {
    setViewingFromScan(true);
    setCurrentScreen("history");
  };

  // ============================================
  // RENDER SCREENS
  // ============================================

  if (currentScreen === "login") {
    return (
      <LoginScreen
        onNavigate={setCurrentScreen}
        serverBaseUrl={serverBaseUrl}
      />
    );
  }

  if (currentScreen === "register") {
    return (
      <RegisterScreen
        onNavigate={setCurrentScreen}
        serverBaseUrl={serverBaseUrl}
      />
    );
  }

  if (currentScreen === "home") {
    return (
      <>
        <HomeScreen
          onNavigate={setCurrentScreen}
          onOpenSettings={() => setShowSettings(true)}
          autoSaveDataset={autoSaveDataset}
          user={user}
          onLogout={handleLogout}
        />
        <SettingsModal
          visible={showSettings}
          autoSaveDataset={autoSaveDataset}
          serverBaseUrl={serverBaseUrl}
          confidenceThreshold={confidenceThreshold}
          hideColorOverlay={hideColorOverlay}
          onToggleAutoSaveDataset={() => setAutoSaveDataset(!autoSaveDataset)}
          onSetServerUrl={setServerBaseUrl}
          onSetConfidenceThreshold={setConfidenceThreshold}
          onToggleHideColorOverlay={() =>
            setHideColorOverlay(!hideColorOverlay)
          }
          onClose={() => setShowSettings(false)}
        />
      </>
    );
  }

  if (currentScreen === "analytics") {
    return (
      <AnalyticsScreen
        onNavigate={setCurrentScreen}
        analyticsUrl={serverUrls.analytics}
        serverBaseUrl={serverBaseUrl}
        user={user}
      />
    );
  }

  if (currentScreen === "history") {
    return (
      <HistoryScreen
        onNavigate={(screen) => {
          setViewingFromScan(false);
          setCurrentScreen(screen);
        }}
        historyUrl={serverUrls.history}
        serverBaseUrl={serverBaseUrl}
        initialEntry={viewingFromScan ? latestHistoryEntry : null}
        user={user}
      />
    );
  }

  if (currentScreen === "autoDataset") {
    return (
      <AutoDatasetScreen
        onNavigate={setCurrentScreen}
        autoDatasetUrl={serverUrls.autoDataset}
      />
    );
  }

  // SCAN SCREEN
  return (
    <ScanScreen
      cameraRef={cameraRef}
      capturedImage={capturedImage}
      analysisResult={analysisResult}
      loading={loading}
      latestHistoryImage={latestHistoryEntry?.url || null}
      onNavigate={setCurrentScreen}
      onTakePicture={handleTakePicture}
      onPickImage={handlePickImage}
      onAnalyze={handleAnalyzeFish}
      onReset={handleReset}
      onViewHistoryImage={handleViewHistoryImage}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permissionCard: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: 340,
    width: "100%",
  },
  permissionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
