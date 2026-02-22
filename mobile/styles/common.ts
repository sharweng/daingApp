import { StyleSheet } from "react-native";

// Design Theme
const theme = {
  colors: {
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    primaryLight: '#60A5FA',
    accent: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    background: '#0F172A',
    backgroundLight: '#1E293B',
    backgroundLighter: '#334155',
    surface: '#1E293B',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    borderLight: '#475569',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
};

export { theme };

export const commonStyles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  // Screen Header - Modern floating style
  screenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.background,
  },
  
  screenTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  
  // Header icon button
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Center content wrapper
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  
  // Camera styles
  cameraWrapper: {
    flex: 1,
    position: "relative",
    backgroundColor: "#000",
  },
  
  camera: {
    flex: 1,
  },
  
  // Camera button container
  buttonContainer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Main capture button
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  innerButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "white",
    borderWidth: 4,
    borderColor: theme.colors.background,
  },
  
  // Preview container
  previewContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  
  previewImage: {
    width: "100%",
    flex: 1,
    resizeMode: "contain",
  },
  
  // Bottom button bar
  bottomButtonBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
    backgroundColor: theme.colors.background,
  },
  
  bottomButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  
  bottomButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  
  // Card styles
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  
  // Loading overlay
  loadingOverlay: {
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
  
  loadingText: {
    color: theme.colors.text,
    marginTop: 16,
    fontSize: 16,
  },
  
  // Refresh button
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    marginTop: 24,
    gap: 8,
  },
  
  refreshButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Legacy compatibility
  placeholderText: {
    fontSize: 22,
    color: theme.colors.textMuted,
    marginTop: 20,
    fontWeight: "600",
  },
  
  placeholderSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 10,
    textAlign: "center",
  },

  button: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    marginHorizontal: 10,
  },
  
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  
  row: {
    flexDirection: "row",
  },
  
  resultHeader: {
    fontSize: 20,
    color: theme.colors.success,
    marginBottom: 20,
    fontWeight: "bold",
  },
});
