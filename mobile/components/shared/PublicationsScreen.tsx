import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";
import { getPublicationsByType, Publication } from "../../data/publications";
import type { Screen, NavigationParams } from "../../types";

interface PublicationsScreenProps {
  onNavigate: (screen: Screen, params?: NavigationParams) => void;
  onBack: () => void;
}

type TabType = "local" | "foreign";

const PublicationsScreen: React.FC<PublicationsScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("local");

  const publications = getPublicationsByType(activeTab);

  const openUrl = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publications</Text>
        <View style={{ width: theme.header.backButtonSize }} />
      </View>

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "local" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("local")}
        >
          <Ionicons
            name="flag"
            size={18}
            color={activeTab === "local" ? "#fff" : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "local" && styles.tabButtonTextActive,
            ]}
          >
            Local
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "foreign" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("foreign")}
        >
          <Ionicons
            name="globe"
            size={18}
            color={
              activeTab === "foreign" ? "#fff" : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "foreign" && styles.tabButtonTextActive,
            ]}
          >
            Foreign
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Description */}
      <View style={styles.tabDescription}>
        <Text style={styles.tabDescriptionText}>
          {activeTab === "local"
            ? "Research, studies, and literature from Philippine institutions and local sources."
            : "Research, studies, and literature from international sources."}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {publications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="document-text-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyText}>No publications listed yet.</Text>
          </View>
        ) : (
          publications.map((pub) => (
            <PublicationCard
              key={pub.id}
              publication={pub}
              onOpenUrl={openUrl}
            />
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

interface PublicationCardProps {
  publication: Publication;
  onOpenUrl: (url: string) => void;
}

const PublicationCard: React.FC<PublicationCardProps> = ({
  publication,
  onOpenUrl,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{publication.title}</Text>

      {publication.authors && (
        <Text style={styles.cardAuthors}>{publication.authors}</Text>
      )}

      <Text style={styles.cardMeta}>
        {publication.publication}
        {publication.year && ` (${publication.year})`}
        {publication.volume && `, ${publication.volume}`}
        {publication.pages && `, pp. ${publication.pages}`}
      </Text>

      <Text style={styles.cardReference}>{publication.reference}</Text>

      {publication.url && publication.url !== "https://doi.org/" && (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => onOpenUrl(publication.url)}
        >
          <Ionicons
            name="open-outline"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={styles.linkButtonText}>View original source</Text>
        </TouchableOpacity>
      )}
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
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  tabButtonTextActive: {
    color: "#fff",
  },
  tabDescription: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabDescriptionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  card: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  cardAuthors: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  cardReference: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkButtonText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: "600",
  },
});

export default PublicationsScreen;
