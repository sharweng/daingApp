import React from "react";
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
import type { Screen } from "../types";

interface ScanScreenProps {
  cameraRef: React.RefObject<CameraView | null>;
  capturedImage: string | null;
  resultImage: string | null;
  loading: boolean;
  latestHistoryImage: string | null;
  onNavigate: (screen: Screen) => void;
  onTakePicture: () => void;
  onPickImage: () => void;
  onAnalyze: () => void;
  onReset: () => void;
  onViewHistoryImage: () => void;
}

export const ScanScreen: React.FC<ScanScreenProps> = ({
  cameraRef,
  capturedImage,
  resultImage,
  loading,
  latestHistoryImage,
  onNavigate,
  onTakePicture,
  onPickImage,
  onAnalyze,
  onReset,
  onViewHistoryImage,
}) => {
  return (
    <View style={commonStyles.container}>
      {!resultImage && !capturedImage && (
        <View style={commonStyles.screenHeader}>
          <TouchableOpacity
            onPress={() => {
              onReset();
              onNavigate("home");
            }}
          >
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={commonStyles.screenTitle}>Scan Fish</Text>
          <View style={{ width: 28 }} />
        </View>
      )}

      {/* SCENARIO A: SHOW RESULT FROM SERVER */}
      {resultImage ? (
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
            <Text style={commonStyles.screenTitle}>Analysis Result</Text>
            <View style={{ width: 28 }} />
          </View>
          <View style={commonStyles.previewContainer}>
            <Image
              source={{ uri: resultImage }}
              style={commonStyles.previewImage}
            />
          </View>
          <View style={commonStyles.bottomButtonBar}>
            <TouchableOpacity
              style={[
                commonStyles.bottomButton,
                { backgroundColor: "#3b82f6" },
              ]}
              onPress={() => {
                onReset();
              }}
            >
              <Text style={commonStyles.bottomButtonText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : /* SCENARIO B: SHOW PREVIEW BEFORE SENDING */
      capturedImage ? (
        <View style={commonStyles.container}>
          <View style={commonStyles.screenHeader}>
            <TouchableOpacity onPress={onReset}>
              <Ionicons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>
            <Text style={commonStyles.screenTitle}>Preview</Text>
            <View style={{ width: 28 }} />
          </View>
          <View style={commonStyles.previewContainer}>
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
                  onPress={onAnalyze}
                >
                  <Text style={commonStyles.bottomButtonText}>Analyze</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ) : (
        /* SCENARIO C: LIVE CAMERA */
        <View style={commonStyles.cameraWrapper}>
          <CameraView style={commonStyles.camera} ref={cameraRef} />
          <View style={commonStyles.buttonContainer}>
            {latestHistoryImage && (
              <TouchableOpacity
                onPress={onViewHistoryImage}
                style={{
                  position: "absolute",
                  left: 60,
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  overflow: "hidden",
                  borderWidth: 2,
                  borderColor: "white",
                }}
              >
                <Image
                  source={{ uri: latestHistoryImage }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={commonStyles.captureButton}
              onPress={onTakePicture}
            >
              <View style={commonStyles.innerButton} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onPickImage}
              style={{
                position: "absolute",
                right: 60,
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: "white",
              }}
            >
              <Ionicons name="images" size={32} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};
