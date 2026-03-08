import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";
import { API_BASE_URL } from "../../constants/config";
import type { Screen, User, NavigationParams } from "../../types";
import { useAuth } from "../../contexts/AuthContext";

interface SettingsScreenProps {
  onNavigate: (screen: Screen, params?: NavigationParams) => void;
  onBack: () => void;
  onOpenSettingsModal: () => void;
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  showChevron?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  subtitle,
  onPress,
  color = theme.colors.text,
  showChevron = true,
}) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuIconContainer, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <View style={styles.menuContent}>
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    {showChevron && (
      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.colors.textSecondary}
      />
    )}
  </TouchableOpacity>
);

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "admin":
      return "#EF4444";
    case "seller":
      return "#10B981";
    default:
      return "#3B82F6";
  }
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onNavigate,
  onBack,
  onOpenSettingsModal,
}) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout(API_BASE_URL);
      onNavigate("home");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: theme.header.backButtonSize }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        {user ? (
          <TouchableOpacity
            style={styles.profileSection}
            onPress={() => onNavigate("profile")}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              {(user.avatar_url || user.avatar) ? (
                <Image
                  source={{ uri: user.avatar_url || user.avatar }}
                  style={{ width: 64, height: 64, borderRadius: 32 }}
                />
              ) : (
                <Ionicons name="person" size={32} color="#fff" />
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.username}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: getRoleBadgeColor(user.role) },
                ]}
              >
                <Text style={styles.roleText}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginPrompt}
            onPress={() => onNavigate("login")}
          >
            <View style={styles.loginPromptIcon}>
              <Ionicons
                name="person-add"
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.loginPromptContent}>
              <Text style={styles.loginPromptTitle}>Sign In</Text>
              <Text style={styles.loginPromptSubtitle}>
                Sign in to access all features
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        {/* Account Section (only if logged in) */}
        {user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="heart-outline"
                label="Wishlist"
                subtitle="Products you've saved"
                onPress={() => onNavigate("wishlist")}
              />
              <MenuItem
                icon="receipt-outline"
                label="My Orders"
                subtitle="View order history and status"
                onPress={() => onNavigate("userOrders")}
              />
              <MenuItem
                icon="document-text-outline"
                label="My Community Posts"
                subtitle="View and manage your posts"
                onPress={() => onNavigate("myPosts")}
              />
            </View>
          </View>
        )}

        {/* Seller Section */}
        {user?.role === "seller" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SELLER</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="speedometer-outline"
                label="Dashboard"
                subtitle="View your seller analytics"
                onPress={() => onNavigate("sellerDashboard")}
                color="#10B981"
              />
              <MenuItem
                icon="cube-outline"
                label="My Products"
                subtitle="Manage your product listings"
                onPress={() => onNavigate("sellerProducts")}
                color="#10B981"
              />
              <MenuItem
                icon="receipt-outline"
                label="Orders"
                subtitle="Manage customer orders"
                onPress={() => onNavigate("sellerOrders")}
                color="#10B981"
              />
              <MenuItem
                icon="star-outline"
                label="Reviews"
                subtitle="View customer feedback"
                onPress={() => onNavigate("sellerReviews")}
                color="#10B981"
              />
            </View>
          </View>
        )}

        {/* Admin Section */}
        {user?.role === "admin" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADMIN</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="speedometer-outline"
                label="Admin Dashboard"
                subtitle="Manage users, orders, posts, and more"
                onPress={() => onNavigate("adminDashboard")}
                color="#EF4444"
              />
            </View>
          </View>
        )}

        {/* Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMATION</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="fish-outline"
              label="About Daing"
              subtitle="Learn about dried fish types"
              onPress={() => onNavigate("aboutDaing")}
            />
            <MenuItem
              icon="document-text-outline"
              label="Publications"
              subtitle="Research and studies"
              onPress={() => onNavigate("publications")}
            />
            <MenuItem
              icon="people-outline"
              label="About Us"
              subtitle="Meet the development team"
              onPress={() => onNavigate("aboutUs")}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="mail-outline"
              label="Contact Us"
              subtitle="Get help or send feedback"
              onPress={() => onNavigate("contact")}
            />
          </View>
        </View>

        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APP SETTINGS</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="options-outline"
              label="More Settings"
              subtitle="Confidence, server URL & more"
              onPress={onOpenSettingsModal}
            />
          </View>
        </View>

        {/* Logout Button */}
        {user && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
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
  backButton: {
    width: theme.header.backButtonSize,
    height: theme.header.backButtonSize,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: theme.header.titleSize,
    fontWeight: theme.header.titleWeight,
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loginPromptIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}20`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  loginPromptContent: {
    flex: 1,
  },
  loginPromptTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  loginPromptSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 8,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  menuSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
});

export default SettingsScreen;
