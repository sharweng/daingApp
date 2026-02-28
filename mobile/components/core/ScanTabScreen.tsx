import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";
import type { Screen, User } from "../../types";

interface ScanTabScreenProps {
  onNavigate: (screen: Screen) => void;
  autoSaveDataset: boolean;
  user?: User | null;
}

export const ScanTabScreen: React.FC<ScanTabScreenProps> = ({
  onNavigate,
  autoSaveDataset,
  user,
}) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>
          {user ? `Hello, ${user.username}!` : "Welcome!"}
        </Text>
        <Text style={styles.welcomeSubtitle}>
          AI-powered dried fish quality detection
        </Text>
      </View>

      {/* SCAN BUTTON */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => onNavigate("scan")}
        activeOpacity={0.85}
      >
        <View style={styles.scanButtonInner}>
          <View style={styles.scanIconContainer}>
            <Ionicons name="scan" size={48} color="#fff" />
          </View>
          <Text style={styles.scanButtonText}>Start Scanning</Text>
          <Text style={styles.scanButtonSubtext}>
            Analyze dried fish quality
          </Text>
        </View>
      </TouchableOpacity>

      {/* QUICK ACTIONS */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => onNavigate("history")}
            activeOpacity={0.7}
          >
            <View
              style={[styles.quickActionIcon, { backgroundColor: "#3B82F6" }]}
            >
              <Ionicons name="time" size={24} color="#fff" />
            </View>
            <Text style={styles.quickActionTitle}>History</Text>
            <Text style={styles.quickActionSubtitle}>View past scans</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => onNavigate("analytics")}
            activeOpacity={0.7}
          >
            <View
              style={[styles.quickActionIcon, { backgroundColor: "#8B5CF6" }]}
            >
              <Ionicons name="stats-chart" size={24} color="#fff" />
            </View>
            <Text style={styles.quickActionTitle}>Analytics</Text>
            <Text style={styles.quickActionSubtitle}>View statistics</Text>
          </TouchableOpacity>
        </View>

        {autoSaveDataset && (
          <TouchableOpacity
            style={styles.datasetCard}
            onPress={() => onNavigate("autoDataset")}
            activeOpacity={0.7}
          >
            <View
              style={[styles.quickActionIcon, { backgroundColor: "#10B981" }]}
            >
              <Ionicons name="folder" size={24} color="#fff" />
            </View>
            <View style={styles.datasetCardContent}>
              <Text style={styles.quickActionTitle}>Auto Dataset</Text>
              <Text style={styles.quickActionSubtitle}>
                View saved training data
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* INFO CARDS */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>How It Works</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Capture Image</Text>
              <Text style={styles.stepDescription}>
                Take a photo or select from gallery
              </Text>
            </View>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>AI Analysis</Text>
              <Text style={styles.stepDescription}>
                Our model detects quality grade
              </Text>
            </View>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Get Results</Text>
              <Text style={styles.stepDescription}>
                View grade, mold status & more
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  scanButton: {
    marginBottom: 32,
  },
  scanButtonInner: {
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  scanIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scanButtonText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  scanButtonSubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  quickActionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  datasetCard: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  datasetCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoStep: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  stepDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  stepDivider: {
    width: 2,
    height: 24,
    backgroundColor: theme.colors.border,
    marginLeft: 15,
    marginVertical: 8,
  },
});

export default ScanTabScreen;
