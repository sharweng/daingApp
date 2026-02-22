import { useState, useRef, useMemo, useEffect } from "react";
import { View, Button, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { commonStyles } from "../styles/common";
import { HomeScreen } from "../components/HomeScreen";
import { ScanScreen } from "../components/ScanScreen";
import { AnalyticsScreen } from "../components/AnalyticsScreen";
import { DataGatheringScreen } from "../components/DataGatheringScreen";
import { HistoryScreen } from "../components/HistoryScreen";
import { DatasetScreen } from "../components/DatasetScreen";
import { SettingsModal } from "../components/SettingsModal";
import { takePicture } from "../utils/camera";
import { analyzeFish, uploadDataset, fetchHistory } from "../services/api";
import { DEFAULT_SERVER_BASE_URL, getServerUrls } from "../constants/config";
import type { Screen, FishType, Condition, HistoryEntry } from "../types";

export default function Index() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Navigation & Settings
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [showSettings, setShowSettings] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [serverBaseUrl, setServerBaseUrl] = useState(DEFAULT_SERVER_BASE_URL);
  const serverUrls = useMemo(
    () => getServerUrls(serverBaseUrl),
    [serverBaseUrl],
  );

  // Data Gathering Mode
  const [fishType, setFishType] = useState<FishType>("danggit");
  const [condition, setCondition] = useState<Condition>("local_quality");
  const [latestHistoryEntry, setLatestHistoryEntry] =
    useState<HistoryEntry | null>(null);
  const [viewingFromScan, setViewingFromScan] = useState(false);

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
  }, [serverUrls.history, resultImage]); // Refresh when new analysis is done

  // Check camera permissions
  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={commonStyles.container}>
        <Button onPress={requestPermission} title="Grant Camera Permission" />
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
      const result = await analyzeFish(capturedImage, serverUrls.analyze);
      setResultImage(result);
    } catch (error) {
      Alert.alert(
        "Connection Failed",
        `Make sure your server URL is correct.\nCurrent Target: ${serverBaseUrl}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDataset = async () => {
    if (!capturedImage) return;
    setLoading(true);

    try {
      const result = await uploadDataset(
        capturedImage,
        fishType,
        condition,
        serverUrls.uploadDataset,
      );

      if (result.success) {
        Alert.alert(
          "Success",
          `${result.message}\n\nSaved to: ${fishType}/${condition}/`,
        );
        handleReset();
      } else {
        Alert.alert(
          "Upload Failed",
          result.error ||
            "Unknown error occurred. Image was NOT saved to Cloudinary.",
        );
        setLoading(false);
      }
    } catch (error) {
      console.error("Upload Error:", error);
      Alert.alert(
        "Upload Failed",
        "Network error. Check your server connection. Image was NOT saved.",
      );
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setResultImage(null);
    setLoading(false);
  };

  const handleViewHistoryImage = () => {
    setViewingFromScan(true);
    setCurrentScreen("history");
  };

  // ============================================
  // RENDER SCREENS
  // ============================================

  if (currentScreen === "home") {
    return (
      <>
        <HomeScreen
          onNavigate={setCurrentScreen}
          onOpenSettings={() => setShowSettings(true)}
          devMode={devMode}
        />
        <SettingsModal
          visible={showSettings}
          devMode={devMode}
          serverBaseUrl={serverBaseUrl}
          onToggleDevMode={() => setDevMode(!devMode)}
          onSetServerUrl={setServerBaseUrl}
          onClose={() => setShowSettings(false)}
        />
      </>
    );
  }

  if (currentScreen === "analytics") {
    return <AnalyticsScreen onNavigate={setCurrentScreen} />;
  }

  if (currentScreen === "history") {
    return (
      <HistoryScreen
        onNavigate={(screen) => {
          setViewingFromScan(false);
          setCurrentScreen(screen);
        }}
        historyUrl={serverUrls.history}
        initialEntry={viewingFromScan ? latestHistoryEntry : null}
      />
    );
  }

  if (currentScreen === "dataset") {
    return <DatasetScreen onNavigate={setCurrentScreen} />;
  }

  if (currentScreen === "dataGathering") {
    return (
      <DataGatheringScreen
        cameraRef={cameraRef}
        capturedImage={capturedImage}
        loading={loading}
        fishType={fishType}
        condition={condition}
        onNavigate={setCurrentScreen}
        onTakePicture={handleTakePicture}
        onUpload={handleUploadDataset}
        onReset={handleReset}
        onSetFishType={setFishType}
        onSetCondition={setCondition}
      />
    );
  }

  // SCAN SCREEN
  return (
    <ScanScreen
      cameraRef={cameraRef}
      capturedImage={capturedImage}
      resultImage={resultImage}
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
