import { StyleSheet } from "react-native";

const theme = {
  colors: {
    primary: "#3B82F6",
    error: "#EF4444",
    background: "#0F172A",
    backgroundLight: "#1E293B",
    surface: "#1E293B",
    text: "#FFFFFF",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    border: "#334155",
    overlay: "rgba(0, 0, 0, 0.85)",
  },
};

export const historyStyles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Date sections
  dateSection: {
    marginBottom: 24,
  },

  dateSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },

  dateHeader: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // Select all button
  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },

  selectAllButtonInactive: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },

  selectAllText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "600",
  },

  selectAllTextInactive: {
    color: theme.colors.primary,
  },

  // Grid layout
  gridRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },

  square: {
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundLight,
    overflow: "hidden",
  },

  squareImage: {
    width: "100%",
    height: "100%",
  },

  squareSpacer: {
    backgroundColor: "transparent",
  },

  // Selection checkbox
  selectionCheckbox: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },

  selectionCheckboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  // Empty state
  emptyStateWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },

  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  emptyTitle: {
    fontSize: 22,
    color: theme.colors.text,
    fontWeight: "600",
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  // Fullscreen view
  fullScreenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  fullScreenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalContent: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  modalImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    marginBottom: 16,
  },

  modalTimestamp: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 20,
  },

  modalCloseButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },

  modalCloseText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },

  // Loading center
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },

  // Deletion overlay
  deletionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },

  deletionCard: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 40,
    paddingVertical: 32,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  deletionText: {
    color: theme.colors.text,
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
});
