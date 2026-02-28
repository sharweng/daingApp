import React from "react";
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
import { teamMembers, tupInfo, TeamMember } from "../../data/team";
import type { Screen, NavigationParams } from "../../types";

interface AboutUsScreenProps {
  onNavigate: (screen: Screen, params?: NavigationParams) => void;
  onBack: () => void;
}

const AboutUsScreen: React.FC<AboutUsScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Failed to open link:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={{ width: theme.header.backButtonSize }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TUP Section */}
        <View style={styles.tupCard}>
          <View style={styles.tupIconContainer}>
            <Ionicons name="school" size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.tupName}>{tupInfo.name}</Text>
          <Text style={styles.tupDescription}>{tupInfo.description}</Text>
        </View>

        {/* Team Section */}
        <Text style={styles.sectionTitle}>The Team</Text>
        <Text style={styles.sectionSubtitle}>
          Meet the people behind DaingGrader
        </Text>

        {teamMembers.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            onOpenLink={openLink}
          />
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

interface TeamMemberCardProps {
  member: TeamMember;
  onOpenLink: (url: string) => void;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  onOpenLink,
}) => {
  return (
    <View style={styles.memberCard}>
      {/* Member Number Badge */}
      <View style={styles.memberBadge}>
        <Text style={styles.memberBadgeText}>{member.id.padStart(2, "0")}</Text>
      </View>

      {/* Avatar */}
      <View style={styles.memberAvatarContainer}>
        <View style={styles.memberAvatar}>
          <Ionicons name="person" size={28} color="#fff" />
        </View>
      </View>

      {/* Info */}
      <Text style={styles.memberName}>{member.name}</Text>
      <Text style={styles.memberRole}>{member.role}</Text>
      <Text style={styles.memberBio}>{member.bio}</Text>

      {/* Contact Info */}
      <View style={styles.contactInfo}>
        {member.age && (
          <View style={styles.contactRow}>
            <Ionicons
              name="person-outline"
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.contactText}>Age: {member.age}</Text>
          </View>
        )}
        {member.contactNumber && (
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => onOpenLink(`tel:${member.contactNumber}`)}
          >
            <Ionicons
              name="call-outline"
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.contactText, styles.contactLink]}>
              {member.contactNumber}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Social Links */}
      <View style={styles.socialLinks}>
        {member.github && (
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => onOpenLink(`https://github.com/${member.github}`)}
          >
            <Ionicons name="logo-github" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        {member.facebook && (
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() =>
              onOpenLink(
                `https://facebook.com/${member.facebook!.replace(/\s/g, "")}`,
              )
            }
          >
            <Ionicons name="logo-facebook" size={18} color="#1877F2" />
          </TouchableOpacity>
        )}
        {member.instagram && (
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() =>
              onOpenLink(`https://instagram.com/${member.instagram}`)
            }
          >
            <Ionicons name="logo-instagram" size={18} color="#E4405F" />
          </TouchableOpacity>
        )}
        {member.email && (
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => onOpenLink(`mailto:${member.email}`)}
          >
            <Ionicons
              name="mail-outline"
              size={18}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>
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
  tupCard: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  tupIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${theme.colors.primary}20`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  tupName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },
  tupDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    alignItems: "center",
  },
  memberBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: `${theme.colors.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  memberAvatarContainer: {
    marginTop: 8,
  },
  memberAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: `${theme.colors.primary}30`,
  },
  memberName: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 12,
    textAlign: "center",
  },
  memberRole: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  memberBio: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  contactInfo: {
    marginTop: 12,
    gap: 6,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  contactLink: {
    color: theme.colors.primary,
  },
  socialLinks: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});

export default AboutUsScreen;
