import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../styles/ecommerce";
import { Screen, ProductCategory } from "../types";
import {
  getSellerProductById,
  createSellerProduct,
  updateSellerProduct,
  getCatalogCategories,
} from "../services/api";

interface Props {
  productId?: string | null;
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

export default function SellerProductEditScreen({
  productId,
  onNavigate,
  onBack,
}: Props) {
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    grade: "A",
    isActive: true,
    images: [] as string[],
  });

  const isEditing = !!productId;

  useEffect(() => {
    loadCategories();
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadCategories = async () => {
    try {
      const cats = await getCatalogCategories();
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const product = await getSellerProductById(productId!);
      setForm({
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        stock: product.stock.toString(),
        category: product.category,
        grade: product.grade || "A",
        isActive: product.isActive,
        images: product.images || [],
      });
    } catch (err) {
      console.error("Failed to load product:", err);
      Alert.alert("Error", "Failed to load product");
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Product name is required");
      return;
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      Alert.alert("Error", "Valid price is required");
      return;
    }

    try {
      setSaving(true);
      const productData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        category: form.category,
        grade: form.grade,
        isActive: form.isActive,
        images: form.images,
      };

      if (isEditing) {
        await updateSellerProduct(productId!, productData);
        Alert.alert("Success", "Product updated");
      } else {
        await createSellerProduct(productData);
        Alert.alert("Success", "Product created");
      }
      onBack();
    } catch (err) {
      Alert.alert("Error", "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

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
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={ecommerceStyles.headerTitle}>
          {isEditing ? "Edit Product" : "Add Product"}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Text style={{ color: "#3B82F6", fontWeight: "600" }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Images */}
        <Text style={ecommerceStyles.formLabel}>Product Images</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {form.images.length > 0 ? (
            form.images.map((img, idx) => (
              <View key={idx} style={{ position: "relative" }}>
                <Image
                  source={{ uri: img }}
                  style={{ width: 80, height: 80, borderRadius: 8 }}
                />
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    backgroundColor: "#EF4444",
                    borderRadius: 12,
                    padding: 4,
                  }}
                  onPress={() =>
                    setForm({
                      ...form,
                      images: form.images.filter((_, i) => i !== idx),
                    })
                  }
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <TouchableOpacity
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: "#E2E8F0",
                borderStyle: "dashed",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() =>
                Alert.alert("Info", "Image picker not implemented in demo")
              }
            >
              <Ionicons name="camera" size={24} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>

        {/* Name */}
        <Text style={ecommerceStyles.formLabel}>Product Name *</Text>
        <TextInput
          style={ecommerceStyles.formInput}
          placeholder="Enter product name"
          placeholderTextColor="#94A3B8"
          value={form.name}
          onChangeText={(text) => setForm({ ...form, name: text })}
        />

        {/* Description */}
        <Text style={ecommerceStyles.formLabel}>Description</Text>
        <TextInput
          style={[
            ecommerceStyles.formInput,
            { height: 100, textAlignVertical: "top" },
          ]}
          placeholder="Enter product description"
          placeholderTextColor="#94A3B8"
          multiline
          value={form.description}
          onChangeText={(text) => setForm({ ...form, description: text })}
        />

        {/* Price & Stock */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={ecommerceStyles.formLabel}>Price (₱) *</Text>
            <TextInput
              style={ecommerceStyles.formInput}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={form.price}
              onChangeText={(text) =>
                setForm({ ...form, price: text.replace(/[^0-9.]/g, "") })
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ecommerceStyles.formLabel}>Stock</Text>
            <TextInput
              style={ecommerceStyles.formInput}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={form.stock}
              onChangeText={(text) =>
                setForm({ ...form, stock: text.replace(/[^0-9]/g, "") })
              }
            />
          </View>
        </View>

        {/* Category */}
        <Text style={ecommerceStyles.formLabel}>Category</Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor:
                  form.category === cat.id ? "#3B82F6" : "#F1F5F9",
              }}
              onPress={() => setForm({ ...form, category: cat.id })}
            >
              <Text
                style={{
                  color: form.category === cat.id ? "#fff" : "#64748B",
                  fontWeight: "500",
                }}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Grade */}
        <Text style={ecommerceStyles.formLabel}>Grade</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {["A", "B", "C"].map((g) => (
            <TouchableOpacity
              key={g}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: form.grade === g ? "#3B82F6" : "#F1F5F9",
                alignItems: "center",
              }}
              onPress={() => setForm({ ...form, grade: g })}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: form.grade === g ? "#fff" : "#64748B",
                }}
              >
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#334155",
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF" }}>
              Product Active
            </Text>
            <Text style={{ fontSize: 14, color: "#94A3B8" }}>
              Show in catalog
            </Text>
          </View>
          <Switch
            value={form.isActive}
            onValueChange={(val) => setForm({ ...form, isActive: val })}
            trackColor={{ false: "#E2E8F0", true: "#3B82F6" }}
            thumbColor="#fff"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[ecommerceStyles.primaryButton, { marginBottom: 32 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={ecommerceStyles.primaryButtonText}>
              {isEditing ? "Update Product" : "Create Product"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
