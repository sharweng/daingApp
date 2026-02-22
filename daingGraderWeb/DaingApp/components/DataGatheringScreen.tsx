import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { CameraView } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { commonStyles } from "../styles/common";
import { dataGatheringStyles } from "../styles/dataGathering";
import { FISH_TYPES, CONDITIONS } from "../constants/config";
import type { Screen, FishType, Condition } from "../types";

interface DataGatheringScreenProps {
  cameraRef: React.RefObject<CameraView | null>;
  capturedImage: string | null;
  loading: boolean;
  fishType: FishType;
  condition: Condition;
  onNavigate: (screen: Screen) => void;
  onTakePicture: () => void;
  onUpload: () => void;
  onReset: () => void;
  onSetFishType: (type: FishType) => void;
  onSetCondition: (condition: Condition) => void;
}

export const DataGatheringScreen: React.FC<DataGatheringScreenProps> = ({
  cameraRef,
  capturedImage,
  loading,
  fishType,
  condition,
  onNavigate,
  onTakePicture,
  onUpload,
  onReset,
  onSetFishType,
  onSetCondition,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const getConditionLabel = () => {
    const found = CONDITIONS.find((c) => c.value === condition);
    return found ? found.label : condition;
  };

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.screenHeader}>
        <TouchableOpacity
          onPress={() => {
            onReset();
            onNavigate("home");
          }}
        >
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={commonStyles.screenTitle}>Data Gathering</Text>
        {!capturedImage && (
          <TouchableOpacity onPress={() => setShowSettings(!showSettings)}>
            <Ionicons
              name={showSettings ? "close" : "menu"}
              size={28}
              color="white"
            />
          </TouchableOpacity>
        )}
        {capturedImage && <View style={{ width: 28 }} />}
      </View>

      {capturedImage ? (
        <View style={commonStyles.previewContainer}>
          <View style={dataGatheringStyles.previewCenteredBar}>
            <Text style={dataGatheringStyles.previewCenteredText}>
              {fishType.charAt(0).toUpperCase() + fishType.slice(1)} •{" "}
              {getConditionLabel()}
            </Text>
          </View>
          <Image
            source={{ uri: capturedImage }}
            style={commonStyles.previewImage}
          />
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#00ff00"
              style={{ position: "absolute" }}
            />
          ) : (
            <View style={commonStyles.bottomButtonBar}>
              <TouchableOpacity
                style={[
                  commonStyles.bottomButton,
                  { backgroundColor: "#dc2626" },
                ]}
                onPress={onReset}
              >
                <Text style={commonStyles.bottomButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  commonStyles.bottomButton,
                  { backgroundColor: "#16a34a" },
                ]}
                onPress={onUpload}
              >
                <Text style={commonStyles.bottomButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={commonStyles.cameraWrapper}>
          <CameraView style={commonStyles.camera} ref={cameraRef} />

          {/* CURRENT SETTINGS LABEL (when settings closed) */}
          {!showSettings && (
            <View style={dataGatheringStyles.statusLabel}>
              <Text style={dataGatheringStyles.statusText}>
                {fishType.charAt(0).toUpperCase() + fishType.slice(1)} •{" "}
                {getConditionLabel()}
              </Text>
            </View>
          )}

          {/* SELECTION PANEL OVERLAY (when settings open) */}
          {showSettings && (
            <View style={dataGatheringStyles.selectionPanel}>
              <View style={dataGatheringStyles.pickerGroup}>
                <Text style={dataGatheringStyles.pickerLabel}>Fish Type:</Text>
                <View style={dataGatheringStyles.selectorRow}>
                  {FISH_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        dataGatheringStyles.selectorButton,
                        fishType === type &&
                          dataGatheringStyles.selectorButtonActive,
                      ]}
                      onPress={() => onSetFishType(type)}
                    >
                      <Text
                        style={[
                          dataGatheringStyles.selectorButtonText,
                          fishType === type &&
                            dataGatheringStyles.selectorButtonTextActive,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={dataGatheringStyles.pickerGroup}>
                <Text style={dataGatheringStyles.pickerLabel}>Condition:</Text>
                <View style={dataGatheringStyles.selectorRow}>
                  {CONDITIONS.map((item) => (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        dataGatheringStyles.selectorButton,
                        condition === item.value &&
                          dataGatheringStyles.selectorButtonActive,
                      ]}
                      onPress={() => onSetCondition(item.value)}
                    >
                      <Text
                        style={[
                          dataGatheringStyles.selectorButtonText,
                          condition === item.value &&
                            dataGatheringStyles.selectorButtonTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* CAMERA BUTTON */}
          <View style={commonStyles.buttonContainer}>
            <TouchableOpacity
              style={commonStyles.captureButton}
              onPress={onTakePicture}
            >
              <View style={commonStyles.innerButton} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};
