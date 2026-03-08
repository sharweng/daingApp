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
import * as ImagePicker from "expo-image-picker";
import { ecommerceStyles } from "../../styles/ecommerce";
import { Screen, ProductCategory, ProductImage } from "../../types";
import {
  getSellerProduct,
  createSellerProduct,
  updateSellerProduct,
  getCatalogCategories,
  uploadSellerProductImages,
  deleteSellerProductImage,
} from "../../services/api";
import { API_BASE_URL } from "../../constants/config";

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
    stock_qty: "",
    category_id: "",
    status: "available",
    grade: "export" as "export" | "local",
    images: [] as ProductImage[],
  });
  const [uploadingImages, setUploadingImages] = useState(false);

  const isEditing = !!productId;

  useEffect(() => {
    loadCategories();
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadCategories = async () => {
    try {
      const cats = await getCatalogCategories(API_BASE_URL);
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const product = await getSellerProduct(API_BASE_URL, productId!);
      if (!product) {
        Alert.alert("Error", "Product not found");
        onBack();
        return;
      }
      setForm({
        name: product.name,
        description: product.description || "",
        price: (product.price || 0).toString(),
        stock_qty: (product.stock_qty || 0).toString(),
        category_id: product.category_id || "",
        status: product.status || "available",
        grade: product.grade || "export",
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

  const handlePickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera roll permission");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        if (!productId) {
          // For new products, store URIs temporarily
          const newImages = result.assets.map((asset, idx) => ({
            url: asset.uri,
            public_id: `temp_${Date.now()}_${idx}`,
          }));
          setForm({ ...form, images: [...form.images, ...newImages] });
        } else {
          // For existing products, upload immediately
          setUploadingImages(true);
          try {
            const imagesToUpload = result.assets.map((asset) => ({
              uri: asset.uri,
              name: asset.fileName || `image_${Date.now()}.jpg`,
              type: asset.mimeType || "image/jpeg",
            }));
            const uploadResult = await uploadSellerProductImages(
              API_BASE_URL,
              productId,
              imagesToUpload,
            );
            if (uploadResult.success && uploadResult.product) {
              setForm({ ...form, images: uploadResult.product.images || [] });
            } else {
              Alert.alert("Error", "Failed to upload images");
            }
          } catch (err) {
            Alert.alert("Error", "Failed to upload images");
          } finally {
            setUploadingImages(false);
          }
        }
      }
    } catch (err) {
      console.error("Image picker error:", err);
      Alert.alert("Error", "Failed to open image picker");
    }
  };

  const handleDeleteImage = async (index: number) => {
    if (!productId) {
      // For new products, just remove from local state
      setForm({
        ...form,
        images: form.images.filter((_, i) => i !== index),
      });
    } else {
      // For existing products, delete from server
      try {
        const result = await deleteSellerProductImage(API_BASE_URL, productId, index);
        if (result.success) {
          setForm({
            ...form,
            images: form.images.filter((_, i) => i !== index),
          });
        } else {
          Alert.alert("Error", "Failed to delete image");
        }
      } catch (err) {
        Alert.alert("Error", "Failed to delete image");
      }
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
      if (isEditing) {
        await updateSellerProduct(API_BASE_URL, productId!, {
          name: form.name.trim(),
          description: form.description.trim(),
          price: parseFloat(form.price),
          stock_qty: parseInt(form.stock_qty) || 0,
          category_id: form.category_id || null,
          status: form.status,
          grade: form.grade,
        });
        Alert.alert("Success", "Product updated");
      } else {
        const createResult = await createSellerProduct(API_BASE_URL, {
          name: form.name.trim(),
          description: form.description.trim(),
          price: parseFloat(form.price),
          stock_qty: parseInt(form.stock_qty) || 0,
          category_id: form.category_id || undefined,
          status: form.status,
          grade: form.grade,
        });
        // Upload images for new product if any
        if (createResult?.success && createResult.product && form.images.length > 0) {
          const tempImages = form.images.filter((img) => img.url.startsWith("file://") || img.url.startsWith("content://"));
          if (tempImages.length > 0) {
            const imagesToUpload = tempImages.map((img) => ({
              uri: img.url,
              name: `image_${Date.now()}.jpg`,
              type: "image/jpeg",
            }));
            await uploadSellerProductImages(
              API_BASE_URL,
              createResult.product.id,
              imagesToUpload,
            );
          }
        }
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
        <TouchableOpacity style={ecommerceStyles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
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
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {form.images.map((img, idx) => (
            <View key={idx} style={{ position: "relative" }}>
              <Image
                source={{ uri: img.url }}
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
                onPress={() => handleDeleteImage(idx)}
              >
                <Ionicons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
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
            onPress={handlePickImages}
            disabled={uploadingImages}
          >
            {uploadingImages ? (
              <ActivityIndicator size="small" color="#CBD5E1" />
            ) : (
              <Ionicons name="camera" size={24} color="#CBD5E1" />
            )}
          </TouchableOpacity>
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
              value={form.stock_qty}
              onChangeText={(text) =>
                setForm({ ...form, stock_qty: text.replace(/[^0-9]/g, "") })
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
                  form.category_id === cat.id ? "#3B82F6" : "#F1F5F9",
              }}
              onPress={() => setForm({ ...form, category_id: cat.id })}
            >
              <Text
                style={{
                  color: form.category_id === cat.id ? "#fff" : "#64748B",
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
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {[
            { value: "export", label: "Export Grade", desc: "Premium quality for export" },
            { value: "local", label: "Local Grade", desc: "Standard quality for local market" },
          ].map((gradeOption) => (
            <TouchableOpacity
              key={gradeOption.value}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor:
                  form.grade === gradeOption.value ? "#10B981" : "#334155",
                borderWidth: 2,
                borderColor:
                  form.grade === gradeOption.value ? "#10B981" : "#475569",
              }}
              onPress={() => setForm({ ...form, grade: gradeOption.value as "export" | "local" })}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontWeight: "600",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                {gradeOption.label}
              </Text>
              <Text
                style={{
                  color: "#94A3B8",
                  fontSize: 11,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {gradeOption.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status */}
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
              Product Available
            </Text>
            <Text style={{ fontSize: 14, color: "#94A3B8" }}>
              Show in catalog and allow purchases
            </Text>
          </View>
          <Switch
            value={form.status === "available"}
            onValueChange={(val) => setForm({ ...form, status: val ? "available" : "inactive" })}
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
