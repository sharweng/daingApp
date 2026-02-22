import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
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

  const handleMenuOption = (action: () => void) => {
    setMenuVisible(false);
    action();
  };

  return (
    <View style={homeStyles.homeContainer}>
      {/* HEADER */}
      <View style={homeStyles.header}>
        {/* User info (compact) */}
        {user ? (
          <View style={homeStyles.headerUserInfo}>
            <View style={homeStyles.headerUserAvatar}>
              <Ionicons name="person" size={14} color="#fff" />
            </View>
            <Text style={homeStyles.headerUserName} numberOfLines={1}>
              {user.username}
            </Text>
          </View>
        ) : (
          <View style={{ width: 44 }} />
        )}
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
