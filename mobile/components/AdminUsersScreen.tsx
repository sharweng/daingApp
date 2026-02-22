import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../styles/ecommerce";
import { AdminUser, Screen } from "../types";
import {
  getAdminUsersSimple,
  updateUserRole,
  toggleUserStatusSimple,
} from "../services/api";

interface Props {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

const roleColors: Record<string, string> = {
  admin: "#EF4444",
  seller: "#10B981",
  user: "#3B82F6",
};

export default function AdminUsersScreen({ onNavigate, onBack }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await getAdminUsersSimple();
      setUsers(result.users);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleRoleChange = (user: AdminUser) => {
    const roles = ["user", "seller", "admin"];
    Alert.alert(
      "Change Role",
      `Select new role for ${user.name || user.email}`,
      roles
        .map((role) => ({
          text: role.charAt(0).toUpperCase() + role.slice(1),
          onPress: async () => {
            if (role === user.role) return;
            try {
              await updateUserRole(user.id, role);
              await loadUsers();
              Alert.alert("Success", "Role updated");
            } catch (err) {
              Alert.alert("Error", "Failed to update role");
            }
          },
        }))
        .concat([{ text: "Cancel", style: "cancel" } as any]),
    );
  };

  const handleToggleStatus = async (user: AdminUser) => {
    const newStatus = !user.isActive;
    Alert.alert(
      newStatus ? "Activate User" : "Deactivate User",
      `Are you sure you want to ${newStatus ? "activate" : "deactivate"} ${user.name || user.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await toggleUserStatusSimple(user.id, newStatus);
              await loadUsers();
              Alert.alert(
                "Success",
                `User ${newStatus ? "activated" : "deactivated"}`,
              );
            } catch (err) {
              Alert.alert("Error", "Failed to update user status");
            }
          },
        },
      ],
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const renderUser = useCallback(
    ({ item }: { item: AdminUser }) => (
      <TouchableOpacity
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
          borderLeftWidth: 4,
          borderLeftColor: item.isActive
            ? roleColors[item.role] || "#64748B"
            : "#CBD5E1",
        }}
        onPress={() => onNavigate("adminUserDetail", { userId: item.id })}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "#334155",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "bold", color: "#94A3B8" }}
            >
              {(item.name || item.email).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF" }}
              >
                {item.name || "No Name"}
              </Text>
              {!item.isActive && (
                <View
                  style={{
                    backgroundColor: "#FEE2E2",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    marginLeft: 8,
                  }}
                >
                  <Text style={{ fontSize: 10, color: "#EF4444" }}>
                    Inactive
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 14, color: "#94A3B8", marginTop: 2 }}>
              {item.email}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <View
                style={{
                  backgroundColor: (roleColors[item.role] || "#64748B") + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: roleColors[item.role] || "#64748B",
                    textTransform: "capitalize",
                  }}
                >
                  {item.role}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8 }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#334155",
              borderRadius: 8,
              paddingVertical: 8,
              alignItems: "center",
            }}
            onPress={() => handleRoleChange(item)}
          >
            <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600" }}>
              Change Role
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: item.isActive ? "#FEE2E2" : "#D1FAE5",
              borderRadius: 8,
              paddingVertical: 8,
              alignItems: "center",
            }}
            onPress={() => handleToggleStatus(item)}
          >
            <Text
              style={{
                fontSize: 12,
                color: item.isActive ? "#EF4444" : "#10B981",
                fontWeight: "600",
              }}
            >
              {item.isActive ? "Deactivate" : "Activate"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    ),
    [],
  );

  return (
    <View style={ecommerceStyles.container}>
      <View style={ecommerceStyles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={ecommerceStyles.headerTitle}>Users</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={{ padding: 16 }}>
        <View style={ecommerceStyles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={ecommerceStyles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {["all", "user", "seller", "admin"].map((r) => (
            <TouchableOpacity
              key={r}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor:
                  roleFilter === r ? roleColors[r] || "#3B82F6" : "#F1F5F9",
              }}
              onPress={() => setRoleFilter(r)}
            >
              <Text
                style={{
                  color: roleFilter === r ? "#fff" : "#64748B",
                  fontWeight: "500",
                  textTransform: "capitalize",
                }}
              >
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : filteredUsers.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          <Text style={{ fontSize: 16, color: "#94A3B8", marginTop: 16 }}>
            No users found
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
