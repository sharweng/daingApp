import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../../styles/ecommerce";
import { AdminScanEntry, Screen } from "../../types";
import { getAdminScansSimple } from "../../services/api";

interface Props {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

const gradeColors: Record<string, string> = {
  A: "#10B981",
  B: "#F59E0B",
  C: "#EF4444",
};

export default function AdminScansScreen({ onNavigate, onBack }: Props) {
  const [scans, setScans] = useState<AdminScanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      setLoading(true);
      const data = await getAdminScansSimple();
      setScans(data);
    } catch (err) {
      console.error("Failed to load scans:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadScans();
    setRefreshing(false);
  };

  const filteredScans = scans.filter((s) => {
    const matchesSearch =
      s.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.userEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === "all" || s.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const renderScan = useCallback(
    ({ item }: { item: AdminScanEntry }) => (
      <View
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
        }}
      >
        <View style={{ flexDirection: "row" }}>
          <Image
            source={{ uri: item.imageUrl || "https://via.placeholder.com/80" }}
            style={{ width: 80, height: 80, borderRadius: 8 }}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}
              >
                {item.userName || "Unknown User"}
              </Text>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor:
                    (gradeColors[item.grade] || "#64748B") + "20",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: gradeColors[item.grade] || "#64748B",
                  }}
                >
                  {item.grade}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
              {item.userEmail}
            </Text>
            <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
              {new Date(item.scannedAt).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>

        {/* Detection Details */}
        {item.detections && item.detections.length > 0 && (
          <View
            style={{
              marginTop: 12,
              backgroundColor: "#334155",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#94A3B8",
                marginBottom: 8,
              }}
            >
              Detections
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {item.detections.map((det, idx) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: "#1E293B",
                    borderRadius: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#FFFFFF" }}>
                    {det.label}: {(det.confidence * 100).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Confidence */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <Text style={{ fontSize: 12, color: "#94A3B8" }}>Confidence</Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: gradeColors[item.grade] || "#64748B",
            }}
          >
            {(item.confidence * 100).toFixed(1)}%
          </Text>
        </View>
      </View>
    ),
    [],
  );

  return (
    <View style={ecommerceStyles.container}>
      <View style={ecommerceStyles.header}>
        <TouchableOpacity style={ecommerceStyles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={ecommerceStyles.headerTitle}>Scan History</Text>
        <View style={ecommerceStyles.backButton} />
      </View>

      {/* Search & Filter */}
      <View style={{ padding: 16 }}>
        <View style={ecommerceStyles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={ecommerceStyles.searchInput}
            placeholder="Search by user..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {["all", "A", "B", "C"].map((g) => (
            <TouchableOpacity
              key={g}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor:
                  gradeFilter === g ? gradeColors[g] || "#3B82F6" : "#F1F5F9",
              }}
              onPress={() => setGradeFilter(g)}
            >
              <Text
                style={{
                  color: gradeFilter === g ? "#fff" : "#64748B",
                  fontWeight: "500",
                }}
              >
                {g === "all" ? "All" : `Grade ${g}`}
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
      ) : filteredScans.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="scan-outline" size={64} color="#CBD5E1" />
          <Text style={{ fontSize: 16, color: "#94A3B8", marginTop: 16 }}>
            No scans found
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredScans}
          keyExtractor={(item) => item.id}
          renderItem={renderScan}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
