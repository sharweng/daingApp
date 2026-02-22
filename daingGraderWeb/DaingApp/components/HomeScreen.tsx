import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { homeStyles } from "../styles/home";
import type { Screen } from "../types";

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
  onOpenSettings: () => void;
  devMode: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onOpenSettings,
  devMode,
}) => {
  return (
    <View style={homeStyles.homeContainer}>
      {/* HEADER WITH SETTINGS */}
      <View style={homeStyles.header}>
        <View style={{ width: 28 }} />
        <Text style={homeStyles.appTitle}>DaingGrader</Text>
        <TouchableOpacity
          style={homeStyles.settingsButton}
          onPress={onOpenSettings}
        >
          <Ionicons name="settings-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* HERO SECTION */}
      <View style={homeStyles.heroSection}>
        {/* HERO BUTTON - SCAN */}
        <TouchableOpacity
          style={homeStyles.heroButton}
          onPress={() => onNavigate("scan")}
          activeOpacity={0.8}
        >
          <View style={homeStyles.heroButtonInner}>
            <Ionicons name="camera" size={80} color="#fff" />
            <Text style={homeStyles.heroButtonText}>SCAN</Text>
            <Text style={homeStyles.heroButtonSubtext}>Analyze Dried Fish</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* SECONDARY BUTTONS - Match Preview Style */}
      <View style={homeStyles.buttonGrid}>
        <View style={homeStyles.buttonRow}>
          <TouchableOpacity
            style={homeStyles.gridButton}
            onPress={() => onNavigate("history")}
          >
            <Text style={homeStyles.gridButtonText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={homeStyles.gridButton}
            onPress={() => onNavigate("analytics")}
          >
            <Text style={homeStyles.gridButtonText}>Analytics</Text>
          </TouchableOpacity>
        </View>

        <View style={homeStyles.buttonRow}>
          <TouchableOpacity
            style={[
              homeStyles.gridButton,
              homeStyles.devButton,
              !devMode && homeStyles.hiddenButton,
            ]}
            onPress={() => devMode && onNavigate("dataGathering")}
            disabled={!devMode}
          >
            <Text style={homeStyles.gridButtonText}>Data Gathering</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              homeStyles.gridButton,
              homeStyles.devButton,
              !devMode && homeStyles.hiddenButton,
            ]}
            onPress={() => devMode && onNavigate("dataset")}
            disabled={!devMode}
          >
            <Text style={homeStyles.gridButtonText}>Dataset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
