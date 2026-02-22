import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../styles/ecommerce";
import { Screen, AdminUsersStats } from "../types";
import {
  getAdminUsersStatsSimple,
  getAdminRecentOrders,
  getAdminRecentScans,
} from "../services/api";

interface Props {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

interface DashboardData {
  userStats?: AdminUsersStats;
  recentOrders: any[];
  recentScans: any[];
}

export default function AdminDashboardScreen({ onNavigate, onBack }: Props) {
  const [data, setData] = useState<DashboardData>({
    recentOrders: [],
    recentScans: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userStats, recentOrders, recentScans] = await Promise.all([
        getAdminUsersStatsSimple(),
        getAdminRecentOrders(),
        getAdminRecentScans(),
      ]);
      setData({ userStats: userStats || undefined, recentOrders, recentScans });
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const menuItems = [
    {
      id: "adminUsers",
      icon: "people",
      label: "Users",
      color: "#3B82F6",
      desc: "Manage users",
    },
    {
      id: "adminOrders",
      icon: "receipt",
      label: "Orders",
      color: "#10B981",
      desc: "View orders",
    },
    {
      id: "adminPosts",
      icon: "newspaper",
      label: "Posts",
      color: "#8B5CF6",
      desc: "Community",
    },
    {
      id: "adminScans",
      icon: "scan",
      label: "Scans",
      color: "#F59E0B",
      desc: "Scan history",
    },
    {
      id: "adminVouchers",
      icon: "pricetag",
      label: "Vouchers",
      color: "#EF4444",
      desc: "Discounts",
    },
    {
      id: "adminAuditLogs",
      icon: "document-text",
      label: "Audit Logs",
      color: "#94A3B8",
      desc: "Activity",
    },
  ];

  if (loading) {
    return (
      <View
        style={[
          ecommerceStyles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={ecommerceStyles.container}>
      <View style={ecommerceStyles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={ecommerceStyles.headerTitle}>Admin Dashboard</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginBottom: 16,
            gap: 12,
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: "45%",
              backgroundColor: "#DBEAFE",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Ionicons name="people" size={24} color="#3B82F6" />
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#FFFFFF",
                marginTop: 8,
              }}
            >
              {data.userStats?.total || 0}
            </Text>
            <Text style={{ fontSize: 14, color: "#94A3B8" }}>Total Users</Text>
          </View>
          <View
            style={{
              flex: 1,
              minWidth: "45%",
              backgroundColor: "#D1FAE5",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Ionicons name="storefront" size={24} color="#10B981" />
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#FFFFFF",
                marginTop: 8,
              }}
            >
              {data.userStats?.sellers || 0}
            </Text>
            <Text style={{ fontSize: 14, color: "#94A3B8" }}>Sellers</Text>
          </View>
          <View
            style={{
              flex: 1,
              minWidth: "45%",
              backgroundColor: "#FEF3C7",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Ionicons name="scan" size={24} color="#F59E0B" />
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#FFFFFF",
                marginTop: 8,
              }}
            >
              {data.recentScans?.length || 0}
            </Text>
            <Text style={{ fontSize: 14, color: "#94A3B8" }}>Recent Scans</Text>
          </View>
          <View
            style={{
              flex: 1,
              minWidth: "45%",
              backgroundColor: "#FEE2E2",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Ionicons name="receipt" size={24} color="#EF4444" />
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#FFFFFF",
                marginTop: 8,
              }}
            >
              {data.recentOrders?.length || 0}
            </Text>
            <Text style={{ fontSize: 14, color: "#94A3B8" }}>
              Recent Orders
            </Text>
          </View>
        </View>

        {/* Quick Menu */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: "#FFFFFF",
            marginBottom: 12,
          }}
        >
          Manage
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={{
                width: "47%",
                backgroundColor: "#1E293B",
                borderRadius: 12,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
              onPress={() => onNavigate(item.id as Screen)}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: item.color + "20",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={item.color}
                />
              </View>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}
              >
                {item.label}
              </Text>
              <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                {item.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: "#FFFFFF",
            marginTop: 24,
            marginBottom: 12,
          }}
        >
          Recent Activity
        </Text>
        {data.recentOrders.slice(0, 3).map((order, idx) => (
          <View
            key={idx}
            style={{
              backgroundColor: "#1E293B",
              borderRadius: 12,
              padding: 16,
              marginBottom: 8,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="receipt-outline" size={24} color="#3B82F6" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}
              >
                Order #{order.orderNumber || order.id?.slice(-6)}
              </Text>
              <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                {order.customer || order.email}
              </Text>
            </View>
            <Text
              style={{ fontSize: 14, fontWeight: "bold", color: "#10B981" }}
            >
              ₱{(order.total || 0).toLocaleString()}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
