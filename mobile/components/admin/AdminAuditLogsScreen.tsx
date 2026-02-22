import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../../styles/ecommerce";
import { AdminAuditLogEntry, Screen } from "../../types";
import { getAdminAuditLogs } from "../../services/api";

interface Props {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

const actionColors: Record<string, string> = {
  create: "#10B981",
  update: "#3B82F6",
  delete: "#EF4444",
  login: "#8B5CF6",
  logout: "#64748B",
  other: "#F59E0B",
};

const actionIcons: Record<string, string> = {
  create: "add-circle",
  update: "pencil",
  delete: "trash",
  login: "log-in",
  logout: "log-out",
  other: "ellipse",
};

export default function AdminAuditLogsScreen({ onNavigate, onBack }: Props) {
  const [logs, setLogs] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getAdminAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const filteredLogs = logs.filter(
    (l) => actionFilter === "all" || l.action === actionFilter,
  );

  const renderLog = useCallback(({ item }: { item: AdminAuditLogEntry }) => {
    const color = actionColors[item.action] || actionColors.other;
    const icon = actionIcons[item.action] || actionIcons.other;

    return (
      <View
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 12,
          padding: 16,
          marginBottom: 8,
          flexDirection: "row",
          alignItems: "flex-start",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: color + "20",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
              {item.userName || "System"}
            </Text>
            <View
              style={{
                backgroundColor: color + "20",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 4,
                marginLeft: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color,
                  textTransform: "uppercase",
                }}
              >
                {item.action}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 14, color: "#94A3B8", marginBottom: 4 }}>
            {item.description}
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 12, color: "#94A3B8" }}>
              {item.resource && (
                <Text style={{ color: "#94A3B8" }}>{item.resource} • </Text>
              )}
              {new Date(item.timestamp).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {item.ipAddress && (
              <Text style={{ fontSize: 10, color: "#CBD5E1" }}>
                {item.ipAddress}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }, []);

  const actions = ["all", "create", "update", "delete", "login", "logout"];

  return (
    <View style={ecommerceStyles.container}>
      <View style={ecommerceStyles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={ecommerceStyles.headerTitle}>Audit Logs</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Action Filter */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={actions}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor:
                actionFilter === item
                  ? actionColors[item] || "#3B82F6"
                  : "#F1F5F9",
              marginRight: 8,
            }}
            onPress={() => setActionFilter(item)}
          >
            <Text
              style={{
                color: actionFilter === item ? "#fff" : "#64748B",
                fontWeight: "500",
                textTransform: "capitalize",
              }}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : filteredLogs.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
          <Text style={{ fontSize: 16, color: "#94A3B8", marginTop: 16 }}>
            No logs found
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id}
          renderItem={renderLog}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
