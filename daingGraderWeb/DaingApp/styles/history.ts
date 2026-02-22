import { StyleSheet } from "react-native";

export const historyStyles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  dateSection: {
    marginBottom: 20,
  },
  dateHeader: {
    color: "#cbd5f5",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  square: {
    borderRadius: 0,
    backgroundColor: "#0f172a",
    overflow: "hidden",
    marginBottom: 4,
  },
  squareImage: {
    width: "100%",
    height: "100%",
  },
  squareSpacer: {
    backgroundColor: "transparent",
  },
  emptyStateWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    color: "white",
    fontWeight: "600",
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f2a44",
  },
  modalImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 14,
    marginBottom: 12,
  },
  modalTimestamp: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 16,
  },
  modalCloseButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  modalCloseText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#020617",
  },
  fullScreenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#0a0e27",
  },
  fullScreenImage: {
    flex: 1,
    width: "100%",
    resizeMode: "contain",
  },
  fullScreenMeta: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#1f2a44",
  },
  fullScreenTimestamp: {
    color: "#cbd5f5",
    fontSize: 15,
  },
  actionButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 30,
    backgroundColor: "#020617",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButton: {
    backgroundColor: "#1f2a44",
  },
  deleteButton: {
    backgroundColor: "#dc2626",
  },
  actionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
