import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";

type TabName = "scan" | "market" | "community";

interface TabBarProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

interface TabItem {
  name: TabName;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

const tabs: TabItem[] = [
  {
    name: "market",
    label: "Market",
    icon: "storefront-outline",
    activeIcon: "storefront",
  },
  {
    name: "scan",
    label: "Scan",
    icon: "scan-outline",
    activeIcon: "scan",
  },
  {
    name: "community",
    label: "Community",
    icon: "chatbubbles-outline",
    activeIcon: "chatbubbles",
  },
];

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        const isScanTab = tab.name === "scan";

        return (
          <TouchableOpacity
            key={tab.name}
            style={[styles.tab, isScanTab && styles.scanTab]}
            onPress={() => onTabChange(tab.name)}
            activeOpacity={0.7}
          >
            {isScanTab ? (
              <View
                style={[styles.scanButton, isActive && styles.scanButtonActive]}
              >
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={28}
                  color="#fff"
                />
              </View>
            ) : (
              <>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={24}
                  color={
                    isActive ? theme.colors.primary : theme.colors.textSecondary
                  }
                />
                <Text style={[styles.label, isActive && styles.labelActive]}>
                  {tab.label}
                </Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: theme.colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: 20, // Safe area padding
    paddingTop: 8,
    paddingHorizontal: 16,
    alignItems: "flex-end",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  scanTab: {
    marginTop: -20,
  },
  scanButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanButtonActive: {
    backgroundColor: "#F59E0B",
  },
  label: {
    fontSize: 11,
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  labelActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
});

export default TabBar;
