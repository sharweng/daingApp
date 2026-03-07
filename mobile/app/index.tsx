import { useState, useRef, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { commonStyles, theme } from "../styles/common";
// Core screens
import { ScanScreen } from "../components/core/ScanScreen";
import { AnalyticsScreen } from "../components/core/AnalyticsScreen";
import { HistoryScreen } from "../components/core/HistoryScreen";
import { AutoDatasetScreen } from "../components/core/AutoDatasetScreen";
import ScanTabScreen from "../components/core/ScanTabScreen";
// Shared components
import TabBar from "../components/shared/TabBar";
import SettingsScreen from "../components/shared/SettingsScreen";
import ProfileScreen from "../components/shared/ProfileScreen";
import AppSettingsScreen from "../components/shared/AppSettingsScreen";
import AboutDaingScreen from "../components/shared/AboutDaingScreen";
import PublicationsScreen from "../components/shared/PublicationsScreen";
import ContactScreen from "../components/shared/ContactScreen";
import AboutUsScreen from "../components/shared/AboutUsScreen";
// Auth screens
import { LoginScreen } from "../components/auth/LoginScreen";
import { RegisterScreen } from "../components/auth/RegisterScreen";
// Ecommerce screens
import CatalogScreen from "../components/ecommerce/CatalogScreen";
import ProductDetailScreen from "../components/ecommerce/ProductDetailScreen";
import CartScreen from "../components/ecommerce/CartScreen";
import WishlistScreen from "../components/ecommerce/WishlistScreen";
import CheckoutScreen from "../components/ecommerce/CheckoutScreen";
import UserProfileScreen from "../components/ecommerce/UserProfileScreen";
import UserOrdersScreen from "../components/ecommerce/UserOrdersScreen";
import OrderDetailScreen from "../components/ecommerce/OrderDetailScreen";
import OrderSuccessScreen from "../components/ecommerce/OrderSuccessScreen";
// Seller screens
import SellerDashboardScreen from "../components/seller/SellerDashboardScreen";
import SellerProductsScreen from "../components/seller/SellerProductsScreen";
import SellerProductEditScreen from "../components/seller/SellerProductEditScreen";
import SellerOrdersScreen from "../components/seller/SellerOrdersScreen";
import SellerOrderDetailScreen from "../components/seller/SellerOrderDetailScreen";
import SellerReviewsScreen from "../components/seller/SellerReviewsScreen";
// Admin screens
import AdminDashboardScreen from "../components/admin/AdminDashboardScreen";
import AdminUsersScreen from "../components/admin/AdminUsersScreen";
import AdminOrdersScreen from "../components/admin/AdminOrdersScreen";
import AdminOrderDetailScreen from "../components/admin/AdminOrderDetailScreen";
import AdminVouchersScreen from "../components/admin/AdminVouchersScreen";
import AdminPostsScreen from "../components/admin/AdminPostsScreen";
import AdminScansScreen from "../components/admin/AdminScansScreen";
import AdminAuditLogsScreen from "../components/admin/AdminAuditLogsScreen";
// Community screens
import CommunityScreen from "../components/community/CommunityScreen";
import CommunityCreateScreen from "../components/community/CommunityCreateScreen";
import { CommunityPostDetailScreen } from "../components/community/CommunityPostDetailScreen";
import MyPostsScreen from "../components/community/MyPostsScreen";
import { takePicture } from "../utils/camera";
import { analyzeFish, fetchHistory } from "../services/api";
import { DEFAULT_SERVER_BASE_URL, getServerUrls } from "../constants/config";
import { useAuth } from "../contexts/AuthContext";
import type {
  Screen,
  HistoryEntry,
  AnalysisScanResult,
  NavigationParams,
} from "../types";

type TabName = "scan" | "market" | "community";

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

  // Tab navigation
  const [activeTab, setActiveTab] = useState<TabName>("scan");

  // Screen navigation & Settings
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [navParams, setNavParams] = useState<NavigationParams>({});
  const [screenHistory, setScreenHistory] = useState<
    { screen: Screen; params: NavigationParams }[]
  >([]);
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

  // Navigation helpers
  const navigate = (screen: Screen, params?: NavigationParams) => {
    setScreenHistory((prev) => [
      ...prev,
      { screen: currentScreen, params: navParams },
    ]);
    setNavParams(params || {});
    setCurrentScreen(screen);
  };

  const goBack = () => {
    if (screenHistory.length > 0) {
      const prev = screenHistory[screenHistory.length - 1];
      setScreenHistory((h) => h.slice(0, -1));
      setNavParams(prev.params);
      setCurrentScreen(prev.screen);
    } else {
      setNavParams({});
      setCurrentScreen("home");
    }
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
    // Set default tab if specified in navigation params
    if (navParams.defaultTab && navParams.defaultTab !== activeTab) {
      setActiveTab(navParams.defaultTab);
      setNavParams({}); // Clear the param after using it
    }

    // Handle tab change
    const handleTabChange = (tab: TabName) => {
      setActiveTab(tab);
    };

    // Render tab content
    const renderTabContent = () => {
      switch (activeTab) {
        case "market":
          return (
            <CatalogScreen
              onNavigate={navigate}
              onBack={() => setActiveTab("scan")}
              isTab={true}
            />
          );
        case "community":
          return (
            <CommunityScreen
              onNavigate={navigate}
              onBack={() => setActiveTab("scan")}
              isTab={true}
            />
          );
        case "scan":
        default:
          return (
            <ScanTabScreen
              onNavigate={navigate}
              autoSaveDataset={autoSaveDataset}
              user={user}
            />
          );
      }
    };

    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* Header */}
        <View style={styles.homeHeader}>
          <Text style={styles.homeHeaderTitle}>DaingGrader</Text>
          <View style={styles.headerRightSection}>
            {/* Dynamic buttons based on active tab */}
            {activeTab === "market" && isAuthenticated && (
              <>
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={() => navigate("wishlist")}
                >
                  <Ionicons
                    name="heart-outline"
                    size={24}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={() => navigate("cart")}
                >
                  <Ionicons
                    name="cart-outline"
                    size={24}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
              </>
            )}
            {activeTab === "community" && isAuthenticated && (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => navigate("communityCreate")}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            )}
            {/* Settings/Avatar button */}
            <TouchableOpacity
              style={styles.headerSettingsButton}
              onPress={() => navigate("settings")}
            >
              {user ? (
                (user.avatar_url || user.avatar) ? (
                  <Image
                    source={{ uri: user.avatar_url || user.avatar }}
                    style={styles.headerAvatar}
                  />
                ) : (
                  <View style={[styles.headerAvatar, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person" size={18} color="#fff" />
                  </View>
                )
              ) : (
                <Ionicons
                  name="settings-outline"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Content */}
        <View style={{ flex: 1 }}>{renderTabContent()}</View>

        {/* Tab Bar */}
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
      </View>
    );
  }

  // ============================================
  // SETTINGS & INFO SCREENS
  // ============================================

  if (currentScreen === "settings") {
    return (
      <SettingsScreen
        onNavigate={navigate}
        onBack={goBack}
        onOpenSettingsModal={() => navigate("appSettings")}
      />
    );
  }

  if (currentScreen === "profile") {
    return <ProfileScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "appSettings") {
    return (
      <AppSettingsScreen
        autoSaveDataset={autoSaveDataset}
        serverBaseUrl={serverBaseUrl}
        confidenceThreshold={confidenceThreshold}
        hideColorOverlay={hideColorOverlay}
        onToggleAutoSaveDataset={() => setAutoSaveDataset(!autoSaveDataset)}
        onSetServerUrl={setServerBaseUrl}
        onSetConfidenceThreshold={setConfidenceThreshold}
        onToggleHideColorOverlay={() => setHideColorOverlay(!hideColorOverlay)}
        onBack={goBack}
      />
    );
  }

  if (currentScreen === "aboutDaing") {
    return (
      <AboutDaingScreen
        onNavigate={navigate}
        onBack={goBack}
        selectedSlug={navParams.daingSlug}
      />
    );
  }

  if (currentScreen === "publications") {
    return <PublicationsScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "contact") {
    return <ContactScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "aboutUs") {
    return <AboutUsScreen onNavigate={navigate} onBack={goBack} />;
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

  // ============================================
  // ECOMMERCE SCREENS
  // ============================================

  if (currentScreen === "catalog") {
    return <CatalogScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "productDetail") {
    return (
      <ProductDetailScreen
        productId={navParams.productId || ""}
        onNavigate={navigate}
        onBack={goBack}
      />
    );
  }

  if (currentScreen === "cart") {
    return <CartScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "wishlist") {
    return <WishlistScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "checkout") {
    return <CheckoutScreen onNavigate={navigate} onBack={goBack} />;
  }

  // ============================================
  // USER SCREENS
  // ============================================

  if (currentScreen === "userProfile") {
    return <UserProfileScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "userOrders") {
    return <UserOrdersScreen onNavigate={navigate} onBack={goBack} />;
  }

  // ============================================
  // SELLER SCREENS
  // ============================================

  if (currentScreen === "sellerDashboard") {
    return <SellerDashboardScreen onNavigate={navigate} onBack={goBack} />;
  }

  // ============================================
  // COMMUNITY SCREENS
  // ============================================

  if (currentScreen === "community") {
    return <CommunityScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "communityPostDetail") {
    return (
      <CommunityPostDetailScreen
        postId={navParams.postId || ""}
        onNavigate={navigate}
        onBack={goBack}
      />
    );
  }

  if (currentScreen === "communityCreate") {
    return <CommunityCreateScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "myPosts") {
    return <MyPostsScreen onNavigate={navigate} onBack={goBack} />;
  }

  // ============================================
  // ORDER DETAIL SCREENS
  // ============================================

  if (currentScreen === "orderDetail") {
    return (
      <OrderDetailScreen
        orderId={navParams.orderId || ""}
        serverBaseUrl={serverBaseUrl}
        onNavigate={navigate}
        onBack={goBack}
      />
    );
  }

  if (currentScreen === "orderSuccess") {
    return (
      <OrderSuccessScreen
        orderId={navParams.orderId || ""}
        orderNumber={navParams.orderNumber}
        onNavigate={navigate}
      />
    );
  }

  // ============================================
  // SELLER ADDITIONAL SCREENS
  // ============================================

  if (currentScreen === "sellerProducts") {
    return <SellerProductsScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "sellerProductEdit") {
    return (
      <SellerProductEditScreen
        productId={navParams.productId}
        onNavigate={navigate}
        onBack={goBack}
      />
    );
  }

  if (currentScreen === "sellerOrders") {
    return <SellerOrdersScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "sellerOrderDetail") {
    return (
      <SellerOrderDetailScreen
        orderId={navParams.orderId || ""}
        onNavigate={navigate}
        onBack={goBack}
      />
    );
  }

  if (currentScreen === "sellerReviews") {
    return <SellerReviewsScreen onNavigate={navigate} onBack={goBack} />;
  }

  // ============================================
  // ADMIN SCREENS
  // ============================================

  if (currentScreen === "adminDashboard") {
    return <AdminDashboardScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "adminUsers") {
    return <AdminUsersScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "adminOrders") {
    return <AdminOrdersScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "adminOrderDetail") {
    return (
      <AdminOrderDetailScreen
        orderId={navParams.orderId || ""}
        onNavigate={navigate}
        onBack={goBack}
      />
    );
  }

  if (currentScreen === "adminVouchers") {
    return <AdminVouchersScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "adminPosts") {
    return <AdminPostsScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "adminScans") {
    return <AdminScansScreen onNavigate={navigate} onBack={goBack} />;
  }

  if (currentScreen === "adminAuditLogs") {
    return <AdminAuditLogsScreen onNavigate={navigate} onBack={goBack} />;
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
  // Home header styles
  homeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.header.paddingHorizontal,
    paddingVertical: theme.header.paddingVertical,
    paddingTop: theme.header.paddingTop,
    backgroundColor: theme.colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  homeHeaderTitle: {
    fontSize: theme.header.titleSize,
    fontWeight: theme.header.titleWeight,
    color: theme.colors.text,
  },
  headerRightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerIconButton: {
    width: theme.header.backButtonSize,
    height: theme.header.backButtonSize,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSettingsButton: {
    width: theme.header.backButtonSize,
    height: theme.header.backButtonSize,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
