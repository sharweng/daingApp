import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { theme } from "../../styles/common";
import type { Screen } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { GOOGLE_CLIENT_ID } from "../../constants/config";

interface LoginScreenProps {
  onNavigate: (screen: Screen) => void;
  serverBaseUrl: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigate,
  serverBaseUrl,
}) => {
  const { login, googleLogin, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Manual Google OAuth flow using WebBrowser
  const handleGoogleSignIn = async () => {
    // Check if Google Client ID is configured
    const clientId = GOOGLE_CLIENT_ID?.webClientId;
    if (!clientId || clientId.includes("your-web-client-id")) {
      Alert.alert(
        "Configuration Required",
        "Google Sign-In is not configured. Please set up the Web Client ID in config.ts",
      );
      return;
    }

    setGoogleLoading(true);

    try {
      // Build Google OAuth URL
      const redirectUri = "https://auth.expo.io/@marbe/daingapp"; // Expo redirect URI
      const scope = encodeURIComponent("openid email profile");
      const responseType = "token";

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=${responseType}&` +
        `scope=${scope}`;

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri,
      );

      if (result.type === "success" && result.url) {
        // Parse access token from URL fragment
        const urlParams = result.url.split("#")[1];
        if (urlParams) {
          const params = new URLSearchParams(urlParams);
          const accessToken = params.get("access_token");

          if (accessToken) {
            const response = await googleLogin(serverBaseUrl, accessToken);
            if (response.status === "success") {
              onNavigate("home");
            } else {
              Alert.alert(
                "Google Sign-In Failed",
                response.message || "Please try again",
              );
            }
          } else {
            Alert.alert("Error", "Failed to get access token from Google");
          }
        }
      } else if (result.type === "cancel") {
        // User cancelled - don't show error
      } else {
        Alert.alert("Error", "Google sign-in was interrupted");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter your username or email");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    const response = await login(serverBaseUrl, username.trim(), password);

    if (response.status === "success") {
      onNavigate("home");
    } else {
      Alert.alert("Login Failed", response.message || "Invalid credentials");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons
              name="fish-outline"
              size={64}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to DaingGrader</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color={theme.colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Username or Email"
              placeholderTextColor={theme.colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={theme.colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={styles.loginButtonText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[
              styles.googleButton,
              googleLoading && styles.buttonDisabled,
            ]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#333" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.googleButtonText}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => onNavigate("register")}
          >
            <Text style={styles.registerButtonText}>
              Don't have an account?{" "}
              <Text style={styles.registerLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => onNavigate("home")}
          >
            <Text style={styles.skipButtonText}>Continue without account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputIcon: {
    padding: 14,
  },
  input: {
    flex: 1,
    height: 50,
    color: theme.colors.text,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 14,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    height: 50,
    marginTop: 8,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    height: 50,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  googleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.textMuted,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  registerButton: {
    alignItems: "center",
    marginBottom: 16,
  },
  registerButtonText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  registerLink: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  skipButton: {
    alignItems: "center",
    padding: 12,
  },
  skipButtonText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
