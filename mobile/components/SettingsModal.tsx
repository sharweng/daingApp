import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { modalStyles } from "../styles/modal";

interface SettingsModalProps {
  visible: boolean;
  autoSaveDataset: boolean;
  serverBaseUrl: string;
  confidenceThreshold: number;
  hideColorOverlay: boolean;
  onToggleAutoSaveDataset: () => void;
  onSetServerUrl: (url: string) => void;
  onSetConfidenceThreshold: (value: number) => void;
  onToggleHideColorOverlay: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  autoSaveDataset,
  serverBaseUrl,
  confidenceThreshold,
  hideColorOverlay,
  onToggleAutoSaveDataset,
  onSetServerUrl,
  onSetConfidenceThreshold,
  onToggleHideColorOverlay,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={modalStyles.modalOverlay}>
          <TouchableOpacity
            style={{ flex: 1, minHeight: 100 }}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={[styles.compactModalContent, { maxHeight: "80%" }]}>
            <View style={modalStyles.modalHandle} />
            <Text style={styles.compactTitle}>Settings</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Server URL */}
              <View style={styles.compactSection}>
                <Text style={styles.compactLabel}>Server URL</Text>
                <TextInput
                  style={styles.compactInput}
                  value={serverBaseUrl}
                  onChangeText={onSetServerUrl}
                  placeholder="http://192.168.1.108:8000"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>

              {/* Confidence Threshold Slider */}
              <View style={styles.compactSection}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.compactLabel}>Confidence</Text>
                  <Text style={styles.sliderValue}>
                    {Math.round(confidenceThreshold * 100)}%
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0.3}
                  maximumValue={0.95}
                  step={0.05}
                  value={confidenceThreshold}
                  onValueChange={onSetConfidenceThreshold}
                  minimumTrackTintColor="#3B82F6"
                  maximumTrackTintColor="#334155"
                  thumbTintColor="#3B82F6"
                />
              </View>

              {/* Toggle Options */}
              <View style={styles.togglesContainer}>
                <TouchableOpacity
                  style={styles.compactToggleRow}
                  onPress={onToggleAutoSaveDataset}
                >
                  <Text style={styles.toggleText}>Auto-Save Dataset</Text>
                  <View
                    style={[
                      styles.compactCheckbox,
                      autoSaveDataset && styles.checkboxActive,
                    ]}
                  >
                    {autoSaveDataset && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.compactToggleRow, { borderBottomWidth: 0 }]}
                  onPress={onToggleHideColorOverlay}
                >
                  <Text style={styles.toggleText}>Hide Color Overlay</Text>
                  <View
                    style={[
                      styles.compactCheckbox,
                      hideColorOverlay && styles.checkboxActive,
                    ]}
                  >
                    {hideColorOverlay && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  compactModalContent: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 24,
    maxHeight: "70%",
  },
  compactTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  compactSection: {
    marginBottom: 12,
  },
  compactLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 6,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  compactInput: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#FFFFFF",
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3B82F6",
  },
  slider: {
    width: "100%",
    height: 36,
  },
  togglesContainer: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    marginTop: 4,
  },
  compactToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  toggleText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  compactCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  doneButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
