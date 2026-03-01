import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";
import {
  DAING_TYPES,
  DaingType,
  getDaingTypeBySlug,
} from "../../data/daingTypes";
import type { Screen, NavigationParams } from "../../types";

// Daing type images
const DAING_IMAGES: { [key: string]: any } = {
  bisugo: require("../../assets/images/daing/bisugo.jpg"),
  "dalagang-bukid": require("../../assets/images/daing/dalagangBukid.jpg"),
  danggit: require("../../assets/images/daing/danggit.jpg"),
  espada: require("../../assets/images/daing/espada.jpg"),
  "flying-fish": require("../../assets/images/daing/flyingFish.jpg"),
};

interface AboutDaingScreenProps {
  onNavigate: (screen: Screen, params?: NavigationParams) => void;
  onBack: () => void;
  selectedSlug?: string;
}

const AboutDaingScreen: React.FC<AboutDaingScreenProps> = ({
  onNavigate,
  onBack,
  selectedSlug,
}) => {
  const [selectedType, setSelectedType] = useState<DaingType | null>(
    selectedSlug ? getDaingTypeBySlug(selectedSlug) || null : null,
  );

  // If a specific type is selected, show detail view
  if (selectedType) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setSelectedType(null)}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedType.name}</Text>
          <View style={{ width: theme.header.backButtonSize }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Type Header */}
          <View
            style={[styles.typeHeader, { backgroundColor: selectedType.color }]}
          >
            <Image
              source={DAING_IMAGES[selectedType.slug]}
              style={styles.typeHeaderImage}
              resizeMode="cover"
            />
            <Text style={styles.typeHeaderName}>{selectedType.name}</Text>
          </View>

          {/* Sections */}
          {selectedType.sections.map((section, index) => (
            <View key={index} style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
          ))}

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    );
  }

  // Main list view
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Daing</Text>
        <View style={{ width: theme.header.backButtonSize }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Card */}
        <View style={styles.introCard}>
          <Ionicons name="fish" size={32} color={theme.colors.primary} />
          <Text style={styles.introTitle}>About Daing</Text>
          <Text style={styles.introDescription}>
            Daing (dried fish) is a traditional Filipino product. Learn about
            different types and grading criteria below.
          </Text>
        </View>

        {/* Grading Criteria */}
        <View style={styles.criteriaCard}>
          <Text style={styles.criteriaTitle}>Grading Criteria</Text>
          <View style={styles.criteriaList}>
            <View style={styles.criteriaItem}>
              <View
                style={[styles.criteriaDot, { backgroundColor: "#3B82F6" }]}
              />
              <Text style={styles.criteriaText}>
                Appearance (color, uniformity)
              </Text>
            </View>
            <View style={styles.criteriaItem}>
              <View
                style={[styles.criteriaDot, { backgroundColor: "#10B981" }]}
              />
              <Text style={styles.criteriaText}>
                Texture (dryness, softness)
              </Text>
            </View>
            <View style={styles.criteriaItem}>
              <View
                style={[styles.criteriaDot, { backgroundColor: "#F59E0B" }]}
              />
              <Text style={styles.criteriaText}>Odor (freshness)</Text>
            </View>
          </View>
        </View>

        {/* Types of Daing */}
        <Text style={styles.typesTitle}>Types of Daing</Text>
        <Text style={styles.typesSubtitle}>
          Tap on a type to learn more about it
        </Text>

        <View style={styles.typesGrid}>
          {DAING_TYPES.map((type) => (
            <TouchableOpacity
              key={type.slug}
              style={[styles.typeCard, { borderColor: type.color }]}
              onPress={() => setSelectedType(type)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.typeIconContainer,
                  { backgroundColor: type.color },
                ]}
              >
                <Image
                  source={DAING_IMAGES[type.slug]}
                  style={styles.typeImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.typeName}>{type.name}</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 32 }} />
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
  introCard: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 12,
  },
  introDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  criteriaCard: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  criteriaTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  criteriaList: {
    gap: 10,
  },
  criteriaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  criteriaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  criteriaText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  typesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  typesSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  typesGrid: {
    gap: 12,
  },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  typeImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  typeIcon: {
    fontSize: 24,
  },
  typeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  // Detail view styles
  typeHeader: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  typeHeaderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  typeHeaderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  typeHeaderName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  sectionCard: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});

export default AboutDaingScreen;
