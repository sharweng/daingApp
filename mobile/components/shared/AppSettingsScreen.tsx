import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";

interface AppSettingsScreenProps {
  autoSaveDataset: boolean;
  serverBaseUrl: string;
  confidenceThreshold: number;
  hideColorOverlay: boolean;
  onToggleAutoSaveDataset: () => void;
  onSetServerUrl: (url: string) => void;
  onSetConfidenceThreshold: (value: number) => void;
  onToggleHideColorOverlay: () => void;
  onBack: () => void;
}

const AppSettingsScreen: React.FC<AppSettingsScreenProps> = ({
  autoSaveDataset,
  serverBaseUrl,
  confidenceThreshold,
  hideColorOverlay,
  onToggleAutoSaveDataset,
  onSetServerUrl,
  onSetConfidenceThreshold,
  onToggleHideColorOverlay,
  onBack,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={{ width: theme.header.backButtonSize }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Server Configuration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SERVER CONFIGURATION</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingHeader}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${theme.colors.primary}15` },
                  ]}
                >
                  <Ionicons
                    name="server-outline"
                    size={22}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Server URL</Text>
                  <Text style={styles.settingDescription}>
                    Backend API endpoint
                  </Text>
                </View>
              </View>
              <TextInput
                style={styles.input}
                value={serverBaseUrl}
                onChangeText={onSetServerUrl}
                placeholder="http://192.168.1.108:8000"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
          </View>
        </View>

        {/* Analysis Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ANALYSIS SETTINGS</Text>
          <View style={styles.card}>
            {/* Confidence Threshold */}
            <View style={styles.settingItem}>
              <View style={styles.settingHeader}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: "#10B98115" },
                  ]}
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={22}
                    color="#10B981"
                  />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Confidence Threshold</Text>
                  <Text style={styles.settingDescription}>
                    Minimum confidence for detection
                  </Text>
                </View>
                <Text style={styles.sliderValue}>
                  {Math.round(confidenceThreshold * 100)}%
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.3}
                maximumValue={0.95}
                step={0.05}
                value={confidenceThreshold}
                onValueChange={onSetConfidenceThreshold}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.border}
                thumbTintColor={theme.colors.primary}
              />
            </View>

            <View style={styles.divider} />

            {/* Hide Color Overlay */}
            <TouchableOpacity
              style={styles.toggleItem}
              onPress={onToggleHideColorOverlay}
              activeOpacity={0.7}
            >
              <View style={styles.settingHeader}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: "#8B5CF615" },
                  ]}
                >
                  <Ionicons
                    name="color-palette-outline"
                    size={22}
                    color="#8B5CF6"
                  />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Hide Color Overlay</Text>
                  <Text style={styles.settingDescription}>
                    Disable color analysis overlay
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    hideColorOverlay && styles.checkboxActive,
                  ]}
                >
                  {hideColorOverlay && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA SETTINGS</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.toggleItem}
              onPress={onToggleAutoSaveDataset}
              activeOpacity={0.7}
            >
              <View style={styles.settingHeader}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: "#F5952715" },
                  ]}
                >
                  <Ionicons name="save-outline" size={22} color="#F59527" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Auto-Save Dataset</Text>
                  <Text style={styles.settingDescription}>
                    Automatically save analyzed images
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    autoSaveDataset && styles.checkboxActive,
                  ]}
                >
                  {autoSaveDataset && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 12,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  settingItem: {
    padding: 16,
  },
  toggleItem: {
    padding: 16,
  },
  settingHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.text,
  },
  settingDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
    marginTop: 12,
  },
  slider: {
    marginTop: 12,
    height: 40,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
});

export default AppSettingsScreen;
