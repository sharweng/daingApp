import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../../styles/ecommerce";
import { Voucher, Screen } from "../../types";
import {
  listVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from "../../services/api";

interface Props {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

const defaultForm = {
  code: "",
  description: "",
  discountType: "percentage" as "percentage" | "fixed",
  discountValue: "",
  minPurchase: "",
  maxUses: "",
  expiresAt: "",
  isActive: true,
};

export default function AdminVouchersScreen({ onNavigate, onBack }: Props) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const data = await listVouchers();
      setVouchers(data);
    } catch (err) {
      console.error("Failed to load vouchers:", err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (voucher?: Voucher) => {
    if (voucher) {
      setEditing(voucher);
      setForm({
        code: voucher.code,
        description: voucher.description || "",
        discountType: voucher.discountType,
        discountValue: voucher.discountValue.toString(),
        minPurchase: voucher.minPurchase?.toString() || "",
        maxUses: voucher.maxUses?.toString() || "",
        expiresAt: voucher.expiresAt || "",
        isActive: voucher.isActive,
      });
    } else {
      setEditing(null);
      setForm(defaultForm);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      Alert.alert("Error", "Voucher code is required");
      return;
    }
    if (!form.discountValue || parseFloat(form.discountValue) <= 0) {
      Alert.alert("Error", "Valid discount value is required");
      return;
    }

    try {
      setSaving(true);
      const data = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        minPurchase: form.minPurchase
          ? parseFloat(form.minPurchase)
          : undefined,
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        expiresAt: form.expiresAt || undefined,
        isActive: form.isActive,
      };

      if (editing) {
        await updateVoucher(editing.id, data);
        Alert.alert("Success", "Voucher updated");
      } else {
        await createVoucher(data);
        Alert.alert("Success", "Voucher created");
      }
      setModalVisible(false);
      await loadVouchers();
    } catch (err) {
      Alert.alert("Error", "Failed to save voucher");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (voucher: Voucher) => {
    Alert.alert(
      "Delete Voucher",
      `Are you sure you want to delete "${voucher.code}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVoucher(voucher.id);
              await loadVouchers();
              Alert.alert("Success", "Voucher deleted");
            } catch (err) {
              Alert.alert("Error", "Failed to delete voucher");
            }
          },
        },
      ],
    );
  };

  const renderVoucher = useCallback(({ item }: { item: Voucher }) => {
    const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();
    return (
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
          opacity: item.isActive && !isExpired ? 1 : 0.6,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <View
            style={{
              backgroundColor: "#334155",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "#CBD5E1",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#3B82F6",
                letterSpacing: 1,
              }}
            >
              {item.code}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {!item.isActive && (
              <View
                style={{
                  backgroundColor: "#FEE2E2",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                }}
              >
                <Text style={{ fontSize: 10, color: "#EF4444" }}>Inactive</Text>
              </View>
            )}
            {isExpired && (
              <View
                style={{
                  backgroundColor: "#FEF3C7",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                }}
              >
                <Text style={{ fontSize: 10, color: "#F59E0B" }}>Expired</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={{ fontSize: 14, color: "#94A3B8", marginBottom: 8 }}>
          {item.description || "No description"}
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <View>
            <Text style={{ fontSize: 10, color: "#94A3B8" }}>Discount</Text>
            <Text
              style={{ fontSize: 14, fontWeight: "bold", color: "#10B981" }}
            >
              {item.discountType === "percentage"
                ? `${item.discountValue}%`
                : `₱${item.discountValue}`}
            </Text>
          </View>
          {item.minPurchase && (
            <View>
              <Text style={{ fontSize: 10, color: "#94A3B8" }}>
                Min Purchase
              </Text>
              <Text style={{ fontSize: 14, color: "#FFFFFF" }}>
                ₱{item.minPurchase.toLocaleString()}
              </Text>
            </View>
          )}
          <View>
            <Text style={{ fontSize: 10, color: "#94A3B8" }}>Used</Text>
            <Text style={{ fontSize: 14, color: "#FFFFFF" }}>
              {item.usedCount}
              {item.maxUses ? `/${item.maxUses}` : ""}
            </Text>
          </View>
          {item.expiresAt && (
            <View>
              <Text style={{ fontSize: 10, color: "#94A3B8" }}>Expires</Text>
              <Text
                style={{
                  fontSize: 14,
                  color: isExpired ? "#EF4444" : "#1E293B",
                }}
              >
                {new Date(item.expiresAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#334155",
              borderRadius: 8,
              paddingVertical: 8,
              alignItems: "center",
            }}
            onPress={() => openModal(item)}
          >
            <Text style={{ color: "#94A3B8", fontWeight: "600" }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#FEE2E2",
              borderRadius: 8,
              paddingVertical: 8,
              alignItems: "center",
            }}
            onPress={() => handleDelete(item)}
          >
            <Text style={{ color: "#EF4444", fontWeight: "600" }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={ecommerceStyles.container}>
      <View style={ecommerceStyles.header}>
        <TouchableOpacity style={ecommerceStyles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={ecommerceStyles.headerTitle}>Vouchers</Text>
        <TouchableOpacity
          style={ecommerceStyles.backButton}
          onPress={() => openModal()}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : vouchers.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="pricetag-outline" size={64} color="#CBD5E1" />
          <Text style={{ fontSize: 16, color: "#94A3B8", marginTop: 16 }}>
            No vouchers yet
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#3B82F6",
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 12,
              marginTop: 16,
            }}
            onPress={() => openModal()}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              Create Voucher
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vouchers}
          keyExtractor={(item) => item.id}
          renderItem={renderVoucher}
          contentContainerStyle={{ padding: 16 }}
        />
      )}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#1E293B",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: "80%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "bold", color: "#FFFFFF" }}
              >
                {editing ? "Edit Voucher" : "New Voucher"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={ecommerceStyles.formLabel}>Code *</Text>
            <TextInput
              style={ecommerceStyles.formInput}
              placeholder="e.g. SAVE20"
              placeholderTextColor="#94A3B8"
              value={form.code}
              onChangeText={(text) =>
                setForm({ ...form, code: text.toUpperCase() })
              }
              autoCapitalize="characters"
            />

            <Text style={ecommerceStyles.formLabel}>Description</Text>
            <TextInput
              style={ecommerceStyles.formInput}
              placeholder="Voucher description"
              placeholderTextColor="#94A3B8"
              value={form.description}
              onChangeText={(text) => setForm({ ...form, description: text })}
            />

            <Text style={ecommerceStyles.formLabel}>Discount Type</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor:
                    form.discountType === "percentage" ? "#3B82F6" : "#F1F5F9",
                  alignItems: "center",
                }}
                onPress={() => setForm({ ...form, discountType: "percentage" })}
              >
                <Text
                  style={{
                    color:
                      form.discountType === "percentage" ? "#fff" : "#64748B",
                    fontWeight: "600",
                  }}
                >
                  Percentage (%)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor:
                    form.discountType === "fixed" ? "#3B82F6" : "#F1F5F9",
                  alignItems: "center",
                }}
                onPress={() => setForm({ ...form, discountType: "fixed" })}
              >
                <Text
                  style={{
                    color: form.discountType === "fixed" ? "#fff" : "#64748B",
                    fontWeight: "600",
                  }}
                >
                  Fixed (₱)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={ecommerceStyles.formLabel}>Discount Value *</Text>
                <TextInput
                  style={ecommerceStyles.formInput}
                  placeholder={
                    form.discountType === "percentage" ? "e.g. 20" : "e.g. 100"
                  }
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={form.discountValue}
                  onChangeText={(text) =>
                    setForm({ ...form, discountValue: text })
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ecommerceStyles.formLabel}>Min Purchase (₱)</Text>
                <TextInput
                  style={ecommerceStyles.formInput}
                  placeholder="Optional"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={form.minPurchase}
                  onChangeText={(text) =>
                    setForm({ ...form, minPurchase: text })
                  }
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={ecommerceStyles.formLabel}>Max Uses</Text>
                <TextInput
                  style={ecommerceStyles.formInput}
                  placeholder="Unlimited"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={form.maxUses}
                  onChangeText={(text) => setForm({ ...form, maxUses: text })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ecommerceStyles.formLabel}>
                  Expires (YYYY-MM-DD)
                </Text>
                <TextInput
                  style={ecommerceStyles.formInput}
                  placeholder="Optional"
                  placeholderTextColor="#94A3B8"
                  value={form.expiresAt}
                  onChangeText={(text) => setForm({ ...form, expiresAt: text })}
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginVertical: 16,
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF" }}
              >
                Active
              </Text>
              <Switch
                value={form.isActive}
                onValueChange={(val) => setForm({ ...form, isActive: val })}
                trackColor={{ false: "#E2E8F0", true: "#3B82F6" }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity
              style={[ecommerceStyles.primaryButton, { marginTop: 8 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={ecommerceStyles.primaryButtonText}>
                  {editing ? "Update Voucher" : "Create Voucher"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
