import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User, AuthState, AuthResponse } from "../types";
import {
  setAuthToken,
  loginUser as apiLogin,
  registerUser as apiRegister,
  logoutUser as apiLogout,
  googleSignIn as apiGoogleSignIn,
  getCurrentUser,
  registerWithFirebase,
  loginWithFirebase,
  logoutWithFirebase,
  refreshFirebaseToken,
} from "../services/api";
import { auth as firebaseAuth, getFirebaseToken } from "../services/firebase";

interface AuthContextType extends AuthState {
  login: (
    baseUrl: string,
    username: string,
    password: string,
  ) => Promise<AuthResponse>;
  register: (
    baseUrl: string,
    username: string,
    email: string,
    password: string,
  ) => Promise<AuthResponse>;
  googleLogin: (
    baseUrl: string,
    accessToken?: string,
    idToken?: string,
  ) => Promise<AuthResponse>;
  logout: (baseUrl: string) => Promise<void>;
  restoreSession: (baseUrl: string) => Promise<void>;
  refreshUser: (baseUrl: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = "@daing_auth_token";
const AUTH_USER_KEY = "@daing_auth_user";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Save auth data to storage
  const saveAuthData = useCallback(async (user: User, token: string) => {
    try {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      setAuthToken(token);
    } catch (error) {
      console.error("Failed to save auth data:", error);
    }
  }, []);

  // Clear auth data from storage
  const clearAuthData = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      setAuthToken(null);
    } catch (error) {
      console.error("Failed to clear auth data:", error);
    }
  }, []);

  // Restore session from storage
  const restoreSession = useCallback(
    async (baseUrl: string) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        // First, check if there's a Firebase user logged in
        const firebaseUser = firebaseAuth.currentUser;
        if (firebaseUser) {
          // Refresh the Firebase token
          const token = await getFirebaseToken();
          if (token) {
            setAuthToken(token);

            // Validate with backend
            const response = await getCurrentUser(baseUrl);
            if (response.status === "success" && response.user) {
              await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
              await AsyncStorage.setItem(
                AUTH_USER_KEY,
                JSON.stringify(response.user),
              );

              setState({
                user: response.user,
                token,
                isLoading: false,
                isAuthenticated: true,
              });
              return;
            }
          }
        }

        // Fall back to stored token
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const userJson = await AsyncStorage.getItem(AUTH_USER_KEY);

        if (token && userJson) {
          setAuthToken(token);

          // Validate token with server
          const response = await getCurrentUser(baseUrl);

          if (response.status === "success" && response.user) {
            setState({
              user: response.user,
              token,
              isLoading: false,
              isAuthenticated: true,
            });
            // Update stored user in case it changed
            await AsyncStorage.setItem(
              AUTH_USER_KEY,
              JSON.stringify(response.user),
            );
          } else {
            // Token invalid, clear storage
            await clearAuthData();
            setState({
              user: null,
              token: null,
              isLoading: false,
              isAuthenticated: false,
            });
          }
        } else {
          setState({
            user: null,
            token: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
        await clearAuthData();
        setState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    },
    [clearAuthData],
  );

  // Login - uses Firebase for unified web/mobile auth
  const login = useCallback(
    async (
      baseUrl: string,
      username: string,
      password: string,
    ): Promise<AuthResponse> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Use Firebase-based login (username is email for Firebase)
      const response = await loginWithFirebase(baseUrl, username, password);

      if (response.status === "success" && response.user && response.token) {
        await saveAuthData(response.user, response.token);
        setState({
          user: response.user,
          token: response.token,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }

      return response;
    },
    [saveAuthData],
  );

  // Register - uses Firebase for unified web/mobile auth
  const register = useCallback(
    async (
      baseUrl: string,
      username: string,
      email: string,
      password: string,
    ): Promise<AuthResponse> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Use Firebase-based registration (username is used as display name)
      const response = await registerWithFirebase(
        baseUrl,
        username,
        email,
        password,
      );

      if (response.status === "success" && response.user && response.token) {
        await saveAuthData(response.user, response.token);
        setState({
          user: response.user,
          token: response.token,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }

      return response;
    },
    [saveAuthData],
  );

  // Google Login
  const googleLogin = useCallback(
    async (
      baseUrl: string,
      accessToken?: string,
      idToken?: string,
    ): Promise<AuthResponse> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      const response = await apiGoogleSignIn(baseUrl, accessToken, idToken);

      if (response.status === "success" && response.user && response.token) {
        await saveAuthData(response.user, response.token);
        setState({
          user: response.user,
          token: response.token,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }

      return response;
    },
    [saveAuthData],
  );

  // Logout - logs out from both Firebase and backend
  const logout = useCallback(
    async (baseUrl: string) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      await logoutWithFirebase(baseUrl);
      await clearAuthData();

      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    },
    [clearAuthData],
  );

  // Refresh user data from backend (after profile update, avatar upload, etc.)
  const refreshUser = useCallback(
    async (baseUrl: string) => {
      try {
        const response = await getCurrentUser(baseUrl);
        if (response.status === "success" && response.user) {
          const token = state.token;
          if (token) {
            await saveAuthData(response.user, token);
          }
          setState((prev) => ({
            ...prev,
            user: response.user || null,
          }));
        }
      } catch (error) {
        console.error("Failed to refresh user:", error);
      }
    },
    [state.token, saveAuthData],
  );

  const value: AuthContextType = {
    ...state,
    login,
    register,
    googleLogin,
    logout,
    restoreSession,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
