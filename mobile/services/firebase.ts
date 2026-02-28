/**
 * Firebase Service for Mobile
 * Unified authentication with web using Firebase
 */
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  Auth,
  UserCredential,
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { FIREBASE_CONFIG } from "../constants/config";

// Initialize Firebase (prevent duplicate initialization)
let app: FirebaseApp;
let auth: Auth;

export const initializeFirebase = () => {
  if (!getApps().length) {
    app = initializeApp(FIREBASE_CONFIG);
    // Initialize Auth with AsyncStorage persistence for React Native
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } else {
    app = getApps()[0];
    auth = getAuth(app);
  }
  return { app, auth };
};

// Initialize on import
initializeFirebase();

export { auth };

/**
 * Register user with Firebase Auth
 */
export const firebaseRegister = async (
  email: string,
  password: string,
): Promise<{ user: any; token: string }> => {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  await sendEmailVerification(credential.user);
  const token = await credential.user.getIdToken();
  return {
    user: credential.user,
    token,
  };
};

/**
 * Login user with Firebase Auth
 */
export const firebaseLogin = async (
  email: string,
  password: string,
): Promise<{ user: any; token: string; emailVerified: boolean }> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const token = await credential.user.getIdToken();
  return {
    user: credential.user,
    token,
    emailVerified: credential.user.emailVerified,
  };
};

/**
 * Get current Firebase ID token (refreshes if needed)
 */
export const getFirebaseToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken(true); // Force refresh
  }
  return null;
};

/**
 * Logout from Firebase
 */
export const firebaseLogout = async (): Promise<void> => {
  await signOut(auth);
};

/**
 * Send email verification
 */
export const sendVerificationEmail = async (): Promise<void> => {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    await sendEmailVerification(user);
  }
};

/**
 * Check if user is logged in to Firebase
 */
export const isFirebaseLoggedIn = (): boolean => {
  return auth.currentUser !== null;
};

/**
 * Get current Firebase user
 */
export const getCurrentFirebaseUser = () => {
  return auth.currentUser;
};
