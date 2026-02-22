import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commonStyles } from "../styles/common";
import type { Screen } from "../types";

interface AnalyticsScreenProps {
  onNavigate: (screen: Screen) => void;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  onNavigate,
}) => {
  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.screenHeader}>
        <TouchableOpacity onPress={() => onNavigate("home")}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={commonStyles.screenTitle}>Analytics</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={commonStyles.centerContent}>
        <Ionicons name="bar-chart-outline" size={80} color="#666" />
        <Text style={commonStyles.placeholderText}>Analytics Coming Soon</Text>
        <Text style={commonStyles.placeholderSubtext}>
          Your scan history and statistics will appear here
        </Text>
      </View>
    </View>
  );
};
