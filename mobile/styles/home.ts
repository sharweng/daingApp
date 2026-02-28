import { StyleSheet } from "react-native";
import { theme as themeConstants } from "./theme";

const theme = {
  colors: {
    primary: "#3B82F6",
    primaryDark: "#2563EB",
    accent: "#8B5CF6",
    success: "#10B981",
    background: "#0F172A",
    backgroundLight: "#1E293B",
    surface: "#1E293B",
    text: "#FFFFFF",
    textSecondary: "#94A3B8",
    border: "#334155",
  },
};

export const homeStyles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: themeConstants.header.paddingTop,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },

  appTitle: {
    fontSize: themeConstants.header.titleSize,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: 0.5,
  },

  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: "center",
    alignItems: "center",
  },

  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header user info (compact)
  headerUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: 120,
  },

  headerUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  headerUserName: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
    maxWidth: 80,
  },

  // Hamburger menu styles
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 110,
    paddingRight: 16,
  },

  menuContainer: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 8,
    minWidth: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  menuUserSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 4,
  },

  menuUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  menuUserDetails: {
    marginLeft: 12,
    flex: 1,
  },

  menuUserName: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },

  menuUserRole: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: "capitalize",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderRadius: 10,
  },

  menuItemText: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.text,
  },

  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },

  // Hero section with scan button
  heroSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  heroButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 12,
  },

  heroButtonInner: {
    alignItems: "center",
  },

  heroButtonText: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text,
    marginTop: 12,
    letterSpacing: 2,
  },

  heroButtonSubtext: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },

  // Tagline under hero
  tagline: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 32,
    textAlign: "center",
  },

  // Button grid at bottom
  buttonGrid: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },

  // Modern card-style navigation buttons
  gridButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },

  gridButtonIcon: {
    marginRight: 4,
  },

  gridButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },

  // Dataset button (green accent)
  datasetButton: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.4)",
  },

  datasetButtonText: {
    color: "#10B981",
  },

  // User bar styles
  userBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.backgroundLight,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },

  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  userDetails: {
    flexDirection: "column",
  },

  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },

  userRole: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: "capitalize",
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },

  logoutText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#EF4444",
  },

  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    flex: 1,
  },

  loginText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3B82F6",
  },
});
