import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commonStyles } from "../styles/common";
import type { Screen } from "../types";

interface DatasetScreenProps {
  onNavigate: (screen: Screen) => void;
}

export const DatasetScreen: React.FC<DatasetScreenProps> = ({ onNavigate }) => {
  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.screenHeader}>
        <TouchableOpacity onPress={() => onNavigate("home")}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={commonStyles.screenTitle}>Dataset</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={commonStyles.centerContent}>
        <Ionicons name="folder-open-outline" size={80} color="#666" />
        <Text style={commonStyles.placeholderText}>Dataset</Text>
        <Text style={commonStyles.placeholderSubtext}>
          Collected training data will be managed here
        </Text>
      </View>
    </View>
  );
};
