import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import type { Screen } from "../../types";
import { ecommerceStyles as styles } from "../../styles/ecommerce";

interface UserProfileScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  subtitle,
  onPress,
  color = "#333",
}) => (
  <TouchableOpacity style={styles.listItem} onPress={onPress}>
    <View style={styles.listItemIcon}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={styles.listItemContent}>
      <Text style={[styles.listItemTitle, { color }]}>{label}</Text>
      {subtitle && <Text style={styles.listItemSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color="#ccc" />
  </TouchableOpacity>
);

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          onNavigate("home");
        },
      },
    ]);
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            Please login to view your profile
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 16 }]}
            onPress={() => onNavigate("login")}
          >
            <Text style={styles.primaryButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "#e74c3c";
      case "seller":
        return "#3498db";
      default:
        return "#2ecc71";
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* User Info */}
        <View
          style={{ backgroundColor: "#1E293B", padding: 20, alignItems: "center" }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#334155",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            {user.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
              />
            ) : (
              <Ionicons name="person" size={40} color="#888" />
            )}
          </View>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "#FFFFFF" }}>
            {user.username}
          </Text>
          <Text style={{ fontSize: 14, color: "#888", marginTop: 4 }}>
            {user.email}
          </Text>
          <View
            style={{
              marginTop: 8,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: getRoleBadgeColor(user.role),
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 12,
                fontWeight: "600",
                textTransform: "capitalize",
              }}
            >
              {user.role}
            </Text>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={{ marginTop: 16 }}>
          <Text
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              color: "#888",
              fontSize: 12,
            }}
          >
            ORDERS & PURCHASES
          </Text>
          <MenuItem
            icon="receipt-outline"
            label="My Orders"
            subtitle="View order history and status"
            onPress={() => onNavigate("userOrders")}
          />
          <MenuItem
            icon="heart-outline"
            label="Wishlist"
            subtitle="Products you've saved"
            onPress={() => onNavigate("wishlist")}
          />
          <MenuItem
            icon="cart-outline"
            label="Cart"
            subtitle="Items ready to checkout"
            onPress={() => onNavigate("cart")}
          />
        </View>

        {/* Seller Section */}
        {user.role === "seller" && (
          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                color: "#888",
                fontSize: 12,
              }}
            >
              SELLER DASHBOARD
            </Text>
            <MenuItem
              icon="speedometer-outline"
              label="Dashboard"
              subtitle="View your seller analytics"
              onPress={() => onNavigate("sellerDashboard")}
            />
            <MenuItem
              icon="cube-outline"
              label="My Products"
              subtitle="Manage your product listings"
              onPress={() => onNavigate("sellerProducts")}
            />
            <MenuItem
              icon="receipt-outline"
              label="Orders"
              subtitle="Manage customer orders"
              onPress={() => onNavigate("sellerOrders")}
            />
            <MenuItem
              icon="star-outline"
              label="Reviews"
              subtitle="View customer feedback"
              onPress={() => onNavigate("sellerReviews")}
            />
            <MenuItem
              icon="pricetag-outline"
              label="Discounts"
              subtitle="Manage vouchers and promotions"
              onPress={() => onNavigate("sellerDiscounts")}
            />
          </View>
        )}

        {/* Admin Section */}
        {user.role === "admin" && (
          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                color: "#888",
                fontSize: 12,
              }}
            >
              ADMIN PANEL
            </Text>
            <MenuItem
              icon="speedometer-outline"
              label="Admin Dashboard"
              subtitle="Overview and analytics"
              onPress={() => onNavigate("adminDashboard")}
            />
            <MenuItem
              icon="people-outline"
              label="Users"
              subtitle="Manage user accounts"
              onPress={() => onNavigate("adminUsers")}
            />
            <MenuItem
              icon="newspaper-outline"
              label="Posts"
              subtitle="Moderate community posts"
              onPress={() => onNavigate("adminPosts")}
            />
            <MenuItem
              icon="scan-outline"
              label="Scans"
              subtitle="View all scan history"
              onPress={() => onNavigate("adminScans")}
            />
            <MenuItem
              icon="receipt-outline"
              label="Orders"
              subtitle="View all marketplace orders"
              onPress={() => onNavigate("adminOrders")}
            />
            <MenuItem
              icon="document-text-outline"
              label="Audit Logs"
              subtitle="System activity logs"
              onPress={() => onNavigate("adminAuditLogs")}
            />
            <MenuItem
              icon="pricetag-outline"
              label="Vouchers"
              subtitle="Manage discount vouchers"
              onPress={() => onNavigate("adminVouchers")}
            />
          </View>
        )}

        {/* Community */}
        <View style={{ marginTop: 16 }}>
          <Text
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              color: "#888",
              fontSize: 12,
            }}
          >
            COMMUNITY
          </Text>
          <MenuItem
            icon="chatbubbles-outline"
            label="Community"
            subtitle="Join discussions and share"
            onPress={() => onNavigate("community")}
          />
          <MenuItem
            icon="create-outline"
            label="My Posts"
            subtitle="Your community contributions"
            onPress={() => onNavigate("myPosts")}
          />
        </View>

        {/* Support */}
        <View style={{ marginTop: 16 }}>
          <Text
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              color: "#888",
              fontSize: 12,
            }}
          >
            SUPPORT
          </Text>
          <MenuItem
            icon="mail-outline"
            label="Contact Us"
            subtitle="Get help or send feedback"
            onPress={() => onNavigate("contact")}
          />
          <MenuItem
            icon="information-circle-outline"
            label="About"
            subtitle="Learn about the app"
            onPress={() => onNavigate("about")}
          />
        </View>

        {/* Logout */}
        <View style={{ marginTop: 16, marginBottom: 32 }}>
          <MenuItem
            icon="log-out-outline"
            label="Logout"
            onPress={handleLogout}
            color="#e74c3c"
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default UserProfileScreen;
