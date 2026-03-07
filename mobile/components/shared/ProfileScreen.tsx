import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { theme } from "../../styles/theme";
import { API_BASE_URL } from "../../constants/config";
import type { Screen, NavigationParams } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  uploadProfileAvatar,
  type UserProfile,
  type ProfileUpdateData,
} from "../../services/api";

interface ProfileScreenProps {
  onNavigate: (screen: Screen, params?: NavigationParams) => void;
  onBack: () => void;
}

const genderOptions = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getUserProfile(API_BASE_URL);
      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setGender(data.gender || "");
        setStreetAddress(data.street_address || "");
        setCity(data.city || "");
        setProvince(data.province || "");
        setPostalCode(data.postal_code || "");
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): string | null => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      return "Full name must be at least 2 characters";
    }
    if (!email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email.trim())) {
      return "Please enter a valid email address";
    }
    if (phone.trim()) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) {
        return "Phone number must be at least 10 digits";
      }
    }
    // If any address field is filled, require street, city, and province
    const hasAddress = streetAddress.trim() || city.trim() || province.trim();
    if (hasAddress) {
      if (!streetAddress.trim()) return "Street address is required";
      if (!city.trim()) return "City is required";
      if (!province.trim()) return "Province is required";
    }
    return null;
  };

  const handleAvatarPick = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to change your profile picture.",
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedImage = result.assets[0];
      setUploadingAvatar(true);

      const uploadResult = await uploadProfileAvatar(
        API_BASE_URL,
        selectedImage.uri,
      );
      if (uploadResult.success && uploadResult.avatar_url) {
        setAvatarUrl(uploadResult.avatar_url);
        // Refresh user in AuthContext so avatar shows in header/settings
        await refreshUser(API_BASE_URL);
        Alert.alert("Success", "Profile picture updated successfully");
      } else {
        Alert.alert(
          "Error",
          uploadResult.error || "Failed to upload profile picture",
        );
      }
    } catch (error) {
      console.error("Avatar pick error:", error);
      Alert.alert("Error", "Failed to change profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert("Validation Error", error);
      return;
    }

    try {
      setSaving(true);
      const updateData: ProfileUpdateData = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        gender: gender,
        street_address: streetAddress.trim(),
        city: city.trim(),
        province: province.trim(),
        postal_code: postalCode.trim(),
      };

      const result = await updateUserProfile(API_BASE_URL, updateData);
      if (result.success && result.profile) {
        setProfile(result.profile);
        // Refresh user in AuthContext so changes are reflected everywhere
        await refreshUser(API_BASE_URL);
        Alert.alert("Success", "Profile updated successfully");
      } else {
        Alert.alert("Error", result.error || "Failed to update profile");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters");
      return;
    }

    try {
      setChangingPassword(true);
      const result = await changePassword(
        API_BASE_URL,
        oldPassword,
        newPassword,
      );
      if (result.success) {
        Alert.alert("Success", "Password changed successfully");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordChange(false);
      } else {
        Alert.alert("Info", result.error || "Password change failed");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: theme.header.backButtonSize }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={64} color="#64748B" />
          <Text style={styles.emptyText}>
            Please login to view your profile
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => onNavigate("login")}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: theme.header.backButtonSize }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Avatar & Role */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleAvatarPick}
              disabled={uploadingAvatar}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Ionicons name="person" size={40} color="#fff" />
                </View>
              )}
              {uploadingAvatar ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : (
                <View style={styles.cameraIconContainer}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.userName}>{fullName || user.username}</Text>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: getRoleBadgeColor(user.role) },
              ]}
            >
              <Text style={styles.roleText}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Text>
            </View>
          </View>

          {/* Personal Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>
            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderOptions}>
                  {genderOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.genderOption,
                        gender === option.value && styles.genderOptionSelected,
                      ]}
                      onPress={() => setGender(option.value)}
                    >
                      <Text
                        style={[
                          styles.genderOptionText,
                          gender === option.value &&
                            styles.genderOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Address Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADDRESS</Text>
            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Street Address</Text>
                <TextInput
                  style={styles.input}
                  value={streetAddress}
                  onChangeText={setStreetAddress}
                  placeholder="Enter street address"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter city"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Province</Text>
                <TextInput
                  style={styles.input}
                  value={province}
                  onChangeText={setProvince}
                  placeholder="Enter province"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Postal Code</Text>
                <TextInput
                  style={styles.input}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  placeholder="Enter postal code"
                  placeholderTextColor="#64748B"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          {/* Password Change Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SECURITY</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPasswordChange(!showPasswordChange)}
              >
                <View style={styles.passwordToggleLeft}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={theme.colors.text}
                  />
                  <Text style={styles.passwordToggleText}>Change Password</Text>
                </View>
                <Ionicons
                  name={showPasswordChange ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              {showPasswordChange && (
                <View style={styles.passwordFields}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Current Password</Text>
                    <TextInput
                      style={styles.input}
                      value={oldPassword}
                      onChangeText={setOldPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#64748B"
                      secureTextEntry
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor="#64748B"
                      secureTextEntry
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#64748B"
                      secureTextEntry
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.changePasswordButton}
                    onPress={handlePasswordChange}
                    disabled={changingPassword}
                  >
                    {changingPassword ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.changePasswordButtonText}>
                        Update Password
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "admin":
      return "#EF4444";
    case "seller":
      return "#10B981";
    default:
      return "#3B82F6";
  }
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
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  loginButton: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 8,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  genderOptions: {
    flexDirection: "row",
    gap: 8,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  genderOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  genderOptionText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  genderOptionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  passwordToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  passwordToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  passwordToggleText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  passwordFields: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  changePasswordButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  changePasswordButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ProfileScreen;
