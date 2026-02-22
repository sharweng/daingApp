import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { CameraView } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { commonStyles, theme } from "../../styles/common";
import { ZoomableImage } from "../shared/ZoomableImage";
import type { Screen, AnalysisScanResult } from "../../types";

interface ScanScreenProps {
  cameraRef: React.RefObject<CameraView | null>;
  capturedImage: string | null;
  analysisResult: AnalysisScanResult | null;
  loading: boolean;
  latestHistoryImage: string | null;
  onNavigate: (screen: Screen) => void;
  onTakePicture: () => void;
  onPickImage: () => void;
  onAnalyze: () => void;
  onReset: () => void;
  onViewHistoryImage: () => void;
}

// Helper to get grade color
const getGradeColor = (grade: string) => {
  switch (grade) {
    case "Export":
      return theme.colors.success;
    case "Local":
      return "#F59E0B"; // Amber
    case "Reject":
      return theme.colors.error;
    default:
      return theme.colors.textSecondary;
  }
};

// Helper to get severity color
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "None":
      return theme.colors.success;
    case "Low":
      return "#F59E0B"; // Amber
    case "Moderate":
      return "#F97316"; // Orange
    case "Severe":
      return theme.colors.error;
    default:
      return theme.colors.textSecondary;
  }
};

export const ScanScreen: React.FC<ScanScreenProps> = ({
  cameraRef,
  capturedImage,
  analysisResult,
  loading,
  latestHistoryImage,
  onNavigate,
  onTakePicture,
  onPickImage,
  onAnalyze,
  onReset,
  onViewHistoryImage,
}) => {
  const [selectedFishIndex, setSelectedFishIndex] = useState(0);

  // SCENARIO A: SHOW RESULT FROM SERVER
  if (analysisResult) {
    const fishCount = analysisResult.detections?.length || 0;
    const selectedDetection = analysisResult.detections?.[selectedFishIndex];

    // Get per-fish mold data
    const fishMoldResult =
      analysisResult.mold_analysis?.fish_results?.[selectedFishIndex];

    // Get per-fish color data
    const fishColorStats =
      analysisResult.color_analysis?.color_stats?.[selectedFishIndex];

    // Calculate per-fish color score (convert std to score)
    const getFishColorScore = () => {
      if (fishColorStats?.combined_std !== undefined) {
        const score = Math.min(
          100,
          Math.max(0, 100 * Math.exp(-fishColorStats.combined_std / 35)),
        );
        return score.toFixed(1);
      }
      return (
        analysisResult.color_analysis?.consistency_score?.toFixed(1) || "N/A"
      );
    };

    // Get per-fish grade based on score
    const getFishGrade = () => {
      const score = parseFloat(getFishColorScore());
      if (isNaN(score))
        return analysisResult.color_analysis?.quality_grade || "Unknown";
      if (score >= 75) return "Export";
      if (score >= 50) return "Local";
      return "Reject";
    };

    return (
      <View style={commonStyles.container}>
        <View style={commonStyles.screenHeader}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              onReset();
              onNavigate("home");
            }}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={commonStyles.screenTitle}>Analysis Complete</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Result Image - Zoomable */}
        <View style={styles.resultContainer}>
          <ZoomableImage
            uri={analysisResult.result_image}
            style={styles.resultImage}
          />

          {/* Fish Selection Buttons (if multiple fish) */}
          {fishCount > 1 && (
            <View style={styles.fishSelectorContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fishSelectorContent}
              >
                {analysisResult.detections.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.fishSelectorButton,
                      selectedFishIndex === index &&
                        styles.fishSelectorButtonActive,
                    ]}
                    onPress={() => setSelectedFishIndex(index)}
                  >
                    <Text
                      style={[
                        styles.fishSelectorText,
                        selectedFishIndex === index &&
                          styles.fishSelectorTextActive,
                      ]}
                    >
                      #{index + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Fish Details Overlay Panel - Only show if daing detected */}
          {analysisResult.is_daing_detected && fishCount > 0 && (
            <View style={styles.detailsOverlay}>
              <View style={styles.detailsCard}>
                {/* Classification */}
                <View style={styles.detailRow}>
                  <Ionicons
                    name="fish-outline"
                    size={12}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.detailValue}>
                    {selectedDetection?.fish_type || "Unknown"}{" "}
                    <Text style={styles.confidence}>
                      {((selectedDetection?.confidence || 0) * 100).toFixed(0)}%
                    </Text>
                  </Text>
                </View>

                {/* Color Score */}
                <View style={styles.detailRow}>
                  <Ionicons
                    name="color-palette-outline"
                    size={12}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.detailValue}>{getFishColorScore()}%</Text>
                </View>

                {/* Quality Grade */}
                <View
                  style={[
                    styles.gradeBadge,
                    { backgroundColor: getGradeColor(getFishGrade()) + "20" },
                  ]}
                >
                  <Ionicons
                    name="ribbon-outline"
                    size={12}
                    color={getGradeColor(getFishGrade())}
                  />
                  <Text
                    style={[
                      styles.gradeText,
                      { color: getGradeColor(getFishGrade()) },
                    ]}
                  >
                    {getFishGrade()}
                  </Text>
                </View>

                {/* Mold Coverage */}
                <View style={styles.detailRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={12}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.detailValue}>
                    Mold{" "}
                    {fishMoldResult?.mold_coverage_percent?.toFixed(1) ||
                      analysisResult.mold_analysis?.avg_coverage_percent?.toFixed(
                        1,
                      ) ||
                      "0.0"}
                    %
                  </Text>
                </View>

                {/* Mold Severity */}
                <View
                  style={[
                    styles.severityBadge,
                    {
                      backgroundColor:
                        getSeverityColor(
                          fishMoldResult?.severity ||
                            analysisResult.mold_analysis?.overall_severity ||
                            "None",
                        ) + "20",
                    },
                  ]}
                >
                  <Ionicons
                    name="warning-outline"
                    size={12}
                    color={getSeverityColor(
                      fishMoldResult?.severity ||
                        analysisResult.mold_analysis?.overall_severity ||
                        "None",
                    )}
                  />
                  <Text
                    style={[
                      styles.severityText,
                      {
                        color: getSeverityColor(
                          fishMoldResult?.severity ||
                            analysisResult.mold_analysis?.overall_severity ||
                            "None",
                        ),
                      },
                    ]}
                  >
                    {fishMoldResult?.severity ||
                      analysisResult.mold_analysis?.overall_severity ||
                      "None"}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={commonStyles.bottomButtonBar}>
          <TouchableOpacity
            style={[commonStyles.bottomButton, styles.primaryButton]}
            onPress={onReset}
            activeOpacity={0.8}
          >
            <Ionicons name="scan-outline" size={20} color="#fff" />
            <Text style={commonStyles.bottomButtonText}>Scan Another</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // SCENARIO B: SHOW PREVIEW BEFORE SENDING
  if (capturedImage) {
    return (
      <View style={commonStyles.container}>
        <View style={commonStyles.screenHeader}>
          <TouchableOpacity style={styles.headerButton} onPress={onReset}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={commonStyles.screenTitle}>Preview</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.previewWrapper}>
          <Image
            source={{ uri: capturedImage }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </View>

        <View
          style={[commonStyles.bottomButtonBar, loading && { opacity: 0 }]}
          pointerEvents={loading ? "none" : "auto"}
        >
          <TouchableOpacity
            style={[commonStyles.bottomButton, styles.secondaryButton]}
            onPress={onReset}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color={theme.colors.text} />
            <Text style={commonStyles.bottomButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[commonStyles.bottomButton, styles.successButton]}
            onPress={onAnalyze}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={commonStyles.bottomButtonText}>Analyze</Text>
          </TouchableOpacity>
        </View>

        {/* Full screen loading overlay */}
        {loading && (
          <View style={styles.fullScreenOverlay}>
            <View style={styles.analysisCard}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.analysisText}>Analyzing...</Text>
              <Text style={styles.analysisSubtext}>
                AI is detecting fish quality
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  // SCENARIO C: LIVE CAMERA
  return (
    <View style={commonStyles.container}>
      {/* Floating header over camera */}
      <View style={styles.cameraHeader}>
        <TouchableOpacity
          style={styles.headerButtonTransparent}
          onPress={() => {
            onReset();
            onNavigate("home");
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.cameraTitle}>Scan Fish</Text>
        <View style={{ width: 44 }} />
      </View>

      <CameraView style={commonStyles.camera} ref={cameraRef} />

      {/* Camera controls */}
      <View style={styles.cameraControls}>
        {/* History thumbnail */}
        {latestHistoryImage && (
          <TouchableOpacity
            onPress={onViewHistoryImage}
            style={styles.historyThumbnail}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: latestHistoryImage }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        {!latestHistoryImage && <View style={{ width: 56 }} />}

        {/* Capture button */}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={onTakePicture}
          activeOpacity={0.9}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        {/* Gallery button */}
        <TouchableOpacity
          onPress={onPickImage}
          style={styles.galleryButton}
          activeOpacity={0.8}
        >
          <Ionicons name="images" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Hint text */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>
          Point at dried fish and tap the button
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: "center",
    alignItems: "center",
  },

  headerButtonTransparent: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  cameraHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
  },

  cameraTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  cameraControls: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },

  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#1E293B",
    borderWidth: 4,
    borderColor: theme.colors.background,
  },

  historyThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },

  thumbnailImage: {
    width: "100%",
    height: "100%",
  },

  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  hintContainer: {
    position: "absolute",
    bottom: 150,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  hintText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  resultContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  resultImage: {
    flex: 1,
    width: "100%",
  },

  previewWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  previewImage: {
    flex: 1,
    width: "100%",
  },

  analysisOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },

  fullScreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },

  analysisCard: {
    backgroundColor: theme.colors.backgroundLight,
    paddingHorizontal: 40,
    paddingVertical: 32,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  analysisText: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 16,
  },

  analysisSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  primaryButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    gap: 8,
  },

  secondaryButton: {
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    gap: 8,
  },

  successButton: {
    backgroundColor: theme.colors.success,
    flexDirection: "row",
    gap: 8,
  },

  // Fish Selector Styles
  fishSelectorContainer: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  fishSelectorContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  fishSelectorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderWidth: 2,
    borderColor: "transparent",
  },
  fishSelectorButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  fishSelectorText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
  },
  fishSelectorTextActive: {
    color: "#fff",
  },

  // Details Overlay Styles
  detailsOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  detailsCard: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
  },
  detailLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailLabelText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
  },
  confidence: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: "400",
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  gradeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  severityText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
