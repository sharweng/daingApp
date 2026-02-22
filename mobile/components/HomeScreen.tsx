import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { homeStyles } from "../styles/home";
import type { Screen, User } from "../types";

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
  onOpenSettings: () => void;
  autoSaveDataset: boolean;
  user?: User | null;
  onLogout?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onOpenSettings,
  autoSaveDataset,
  user,
  onLogout,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isEcommerceMode, setIsEcommerceMode] = useState(false);

  const handleMenuOption = (action: () => void) => {
    setMenuVisible(false);
    action();
  };

  // Ecommerce View
  if (isEcommerceMode) {
    return (
      <View style={homeStyles.homeContainer}>
        {/* HEADER */}
        <View style={homeStyles.header}>
          {/* Toggle button - circular icon to switch to Scan */}
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#F59E0B",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => setIsEcommerceMode(false)}
          >
            <Ionicons name="scan" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={homeStyles.appTitle}>Shop</Text>
          <TouchableOpacity
            style={homeStyles.menuButton}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="menu" size={26} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Menu Modal (shared) */}
        <Modal
          visible={menuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable
            style={homeStyles.menuOverlay}
            onPress={() => setMenuVisible(false)}
          >
            <View style={homeStyles.menuContainer}>
              {user && (
                <View style={homeStyles.menuUserSection}>
                  <View style={homeStyles.menuUserAvatar}>
                    <Ionicons name="person" size={20} color="#fff" />
                  </View>
                  <View style={homeStyles.menuUserDetails}>
                    <Text style={homeStyles.menuUserName}>{user.username}</Text>
                    <Text style={homeStyles.menuUserRole}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Text>
                  </View>
                </View>
              )}
              {user ? (
                <TouchableOpacity
                  style={homeStyles.menuItem}
                  onPress={() => handleMenuOption(onLogout || (() => {}))}
                >
                  <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                  <Text style={[homeStyles.menuItemText, { color: "#EF4444" }]}>
                    Sign Out
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={homeStyles.menuItem}
                  onPress={() => handleMenuOption(() => onNavigate("login"))}
                >
                  <Ionicons name="log-in-outline" size={22} color="#3B82F6" />
                  <Text style={[homeStyles.menuItemText, { color: "#3B82F6" }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              )}
              <View style={homeStyles.menuDivider} />
              <TouchableOpacity
                style={homeStyles.menuItem}
                onPress={() => handleMenuOption(onOpenSettings)}
              >
                <Ionicons name="settings-outline" size={22} color="#94A3B8" />
                <Text style={homeStyles.menuItemText}>Settings</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* ECOMMERCE CONTENT */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: "#FFFFFF",
              marginBottom: 8,
            }}
          >
            Dried Fish Marketplace
          </Text>
          <Text style={{ fontSize: 14, color: "#94A3B8", marginBottom: 24 }}>
            Browse quality graded dried fish products
          </Text>

          {/* Quick Actions */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "#3B82F6",
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
              }}
              onPress={() => onNavigate("catalog")}
            >
              <Ionicons name="search" size={24} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", marginTop: 8 }}>
                Browse
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "#EF4444",
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
              }}
              onPress={() => onNavigate("wishlist")}
            >
              <Ionicons name="heart" size={24} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", marginTop: 8 }}>
                Wishlist
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "#10B981",
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
              }}
              onPress={() => onNavigate("cart")}
            >
              <Ionicons name="cart" size={24} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", marginTop: 8 }}>
                Cart
              </Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Cards */}
          <TouchableOpacity
            style={{
              backgroundColor: "#1E293B",
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={() => onNavigate("userProfile")}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#334155",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="person" size={24} color="#64748B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF" }}
              >
                My Profile
              </Text>
              <Text style={{ fontSize: 14, color: "#94A3B8" }}>
                Orders, settings & more
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: "#1E293B",
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={() => onNavigate("userOrders")}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#FEF3C7",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="receipt" size={24} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF" }}
              >
                My Orders
              </Text>
              <Text style={{ fontSize: 14, color: "#94A3B8" }}>
                Track and manage orders
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: "#1E293B",
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={() => onNavigate("community")}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#DBEAFE",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="chatbubbles" size={24} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF" }}
              >
                Community
              </Text>
              <Text style={{ fontSize: 14, color: "#94A3B8" }}>
                Share tips & discussions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          {/* Seller/Admin Quick Access */}
          {user && (user.role === "seller" || user.role === "admin") && (
            <TouchableOpacity
              style={{
                backgroundColor: user.role === "admin" ? "#FEE2E2" : "#D1FAE5",
                borderRadius: 16,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
              onPress={() =>
                onNavigate(
                  user.role === "admin" ? "adminDashboard" : "sellerDashboard",
                )
              }
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor:
                    user.role === "admin" ? "#EF4444" : "#10B981",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons
                  name={user.role === "admin" ? "shield" : "storefront"}
                  size={24}
                  color="#fff"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF" }}
                >
                  {user.role === "admin"
                    ? "Admin Dashboard"
                    : "Seller Dashboard"}
                </Text>
                <Text style={{ fontSize: 14, color: "#94A3B8" }}>
                  {user.role === "admin"
                    ? "Manage users & content"
                    : "Manage products & orders"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={homeStyles.homeContainer}>
      {/* HEADER */}
      <View style={homeStyles.header}>
        {/* Toggle to ecommerce button - circular icon */}
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#10B981",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => setIsEcommerceMode(true)}
        >
          <Ionicons name="storefront-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={homeStyles.appTitle}>DaingGrader</Text>
        <TouchableOpacity
          style={homeStyles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="menu" size={26} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* HAMBURGER MENU MODAL */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={homeStyles.menuOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={homeStyles.menuContainer}>
            {/* User section */}
            {user && (
              <View style={homeStyles.menuUserSection}>
                <View style={homeStyles.menuUserAvatar}>
                  <Ionicons name="person" size={20} color="#fff" />
                </View>
                <View style={homeStyles.menuUserDetails}>
                  <Text style={homeStyles.menuUserName}>{user.username}</Text>
                  <Text style={homeStyles.menuUserRole}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Text>
                </View>
              </View>
            )}

            {/* Menu Items */}
            {user ? (
              <TouchableOpacity
                style={homeStyles.menuItem}
                onPress={() => handleMenuOption(onLogout || (() => {}))}
              >
                <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                <Text style={[homeStyles.menuItemText, { color: "#EF4444" }]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={homeStyles.menuItem}
                onPress={() => handleMenuOption(() => onNavigate("login"))}
              >
                <Ionicons name="log-in-outline" size={22} color="#3B82F6" />
                <Text style={[homeStyles.menuItemText, { color: "#3B82F6" }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            )}

            <View style={homeStyles.menuDivider} />

            <TouchableOpacity
              style={homeStyles.menuItem}
              onPress={() => handleMenuOption(onOpenSettings)}
            >
              <Ionicons name="settings-outline" size={22} color="#94A3B8" />
              <Text style={homeStyles.menuItemText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* HERO SECTION */}
      <View style={homeStyles.heroSection}>
        <TouchableOpacity
          style={homeStyles.heroButton}
          onPress={() => onNavigate("scan")}
          activeOpacity={0.85}
        >
          <View style={homeStyles.heroButtonInner}>
            <Ionicons name="scan" size={64} color="#fff" />
            <Text style={homeStyles.heroButtonText}>SCAN</Text>
            <Text style={homeStyles.heroButtonSubtext}>Analyze Dried Fish</Text>
          </View>
        </TouchableOpacity>
        <Text style={homeStyles.tagline}>
          AI-powered dried fish quality detection
        </Text>
      </View>

      {/* NAVIGATION GRID */}
      <View style={homeStyles.buttonGrid}>
        <View style={homeStyles.buttonRow}>
          <TouchableOpacity
            style={homeStyles.gridButton}
            onPress={() => onNavigate("history")}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={22} color="#94A3B8" />
            <Text style={homeStyles.gridButtonText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={homeStyles.gridButton}
            onPress={() => onNavigate("analytics")}
            activeOpacity={0.7}
          >
            <Ionicons name="stats-chart-outline" size={22} color="#94A3B8" />
            <Text style={homeStyles.gridButtonText}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {autoSaveDataset && (
          <View style={homeStyles.buttonRow}>
            <TouchableOpacity
              style={[homeStyles.gridButton, homeStyles.datasetButton]}
              onPress={() => onNavigate("autoDataset")}
              activeOpacity={0.7}
            >
              <Ionicons name="folder-outline" size={22} color="#10B981" />
              <Text
                style={[
                  homeStyles.gridButtonText,
                  homeStyles.datasetButtonText,
                ]}
              >
                Auto Dataset
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};
