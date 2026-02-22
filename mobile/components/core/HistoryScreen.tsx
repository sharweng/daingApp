import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  ScrollView,
  Dimensions,
  FlatList,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commonStyles, theme } from "../../styles/common";
import { historyStyles } from "../../styles/history";
import { ZoomableImage } from "../shared/ZoomableImage";
import type { Screen, HistoryEntry, User } from "../../types";
import {
  fetchHistory,
  deleteHistoryEntry,
  fetchAllHistory,
} from "../../services/api";

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

type HistoryTab = "my" | "all";

interface HistoryScreenProps {
  onNavigate: (screen: Screen) => void;
  historyUrl: string;
  serverBaseUrl: string;
  initialEntry?: HistoryEntry | null;
  user?: User | null;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onNavigate,
  historyUrl,
  serverBaseUrl,
  initialEntry = null,
  user,
}) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(
    initialEntry,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [activeTab, setActiveTab] = useState<HistoryTab>("my");
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const isAdmin = user?.role === "admin";

  const NUM_COLUMNS = 3;

  const photoSize = useMemo(() => {
    const screenWidth = Dimensions.get("window").width;
    const horizontalPadding = 32; // scrollContent paddingHorizontal: 16 * 2
    const gapSize = 4; // gap between images
    const totalGaps = (NUM_COLUMNS - 1) * gapSize;
    return Math.floor(
      (screenWidth - horizontalPadding - totalGaps) / NUM_COLUMNS,
    );
  }, []);

  const chunkEntries = useCallback(
    (items: HistoryEntry[], chunkSize: number) => {
      const chunks: HistoryEntry[][] = [];
      for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
      }
      return chunks;
    },
    [],
  );

  const sections = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();
    entries.forEach((entry) => {
      const date = new Date(entry.timestamp);
      // Use local date components instead of ISO to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const key = `${year}-${month}-${day}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(entry);
    });

    return Array.from(map.entries())
      .sort((a, b) => (a[0] > b[0] ? -1 : 1))
      .map(([dateKey, list]) => ({
        isoDate: dateKey,
        formattedDate: new Date(dateKey + "T00:00:00").toLocaleDateString(
          undefined,
          {
            weekday: "short",
            month: "long",
            day: "numeric",
            year: "numeric",
          },
        ),
        rows: chunkEntries(list, NUM_COLUMNS),
      }));
  }, [entries, chunkEntries]);

  const loadHistory = useCallback(async () => {
    // Don't load history if user is not logged in
    if (!user) {
      setEntries([]);
      return;
    }

    setLoading(true);
    try {
      let data: HistoryEntry[];
      if (activeTab === "all" && isAdmin) {
        data = await fetchAllHistory(serverBaseUrl);
      } else {
        data = await fetchHistory(historyUrl);
      }
      // Debug: Log fetched data
      if (data.length > 0) {
        console.log("📥 History loaded:", data.length, "entries");
        console.log("📥 First entry analysis data:", {
          id: data[0].id,
          is_daing_detected: data[0].is_daing_detected,
          detections: data[0].detections?.length || 0,
          hasColorAnalysis: !!data[0].color_analysis,
          hasMoldAnalysis: !!data[0].mold_analysis,
        });
      }
      setEntries(data);
    } catch (error) {
      Alert.alert(
        "History",
        "Unable to load history from the server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [historyUrl, serverBaseUrl, activeTab, isAdmin, user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDeleteEntry = useCallback(
    async (entry: HistoryEntry) => {
      if (isDeleting) return;
      setIsDeleting(true);
      try {
        await deleteHistoryEntry(historyUrl, entry.id);
        setEntries((prev) => prev.filter((item) => item.id !== entry.id));
        setSelectedEntry(null);
      } catch (error) {
        Alert.alert(
          "Delete Failed",
          "We couldn't delete this photo. Please try again.",
        );
      } finally {
        setIsDeleting(false);
      }
    },
    [historyUrl, isDeleting],
  );

  const confirmDelete = useCallback(
    (entry: HistoryEntry) => {
      Alert.alert("Delete Photo", "Remove this scan from history?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteEntry(entry),
        },
      ]);
    },
    [handleDeleteEntry],
  );

  const handleLongPress = useCallback((entry: HistoryEntry) => {
    setIsSelectionMode(true);
    setSelectedIds(new Set([entry.id]));
  }, []);

  const handleImagePress = useCallback(
    (entry: HistoryEntry) => {
      if (isSelectionMode) {
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(entry.id)) {
            newSet.delete(entry.id);
          } else {
            newSet.add(entry.id);
          }
          // Exit selection mode if no items selected
          if (newSet.size === 0) {
            setIsSelectionMode(false);
          }
          return newSet;
        });
      } else {
        setSelectedEntry(entry);
      }
    },
    [isSelectionMode],
  );

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      "Delete Photos",
      `Remove ${selectedIds.size} photo${selectedIds.size > 1 ? "s" : ""} from history?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const deletePromises = Array.from(selectedIds).map((id) =>
                deleteHistoryEntry(historyUrl, id),
              );
              await Promise.all(deletePromises);
              setEntries((prev) =>
                prev.filter((item) => !selectedIds.has(item.id)),
              );
              setSelectedIds(new Set());
              setIsSelectionMode(false);
            } catch (error) {
              Alert.alert(
                "Delete Failed",
                "We couldn't delete some photos. Please try again.",
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }, [selectedIds, historyUrl]);

  const cancelSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, []);

  const handleSelectAllInDate = useCallback((dateEntries: HistoryEntry[]) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      const allSelected = dateEntries.every((entry) => newSet.has(entry.id));

      if (allSelected) {
        // Deselect all in this date
        dateEntries.forEach((entry) => newSet.delete(entry.id));
      } else {
        // Select all in this date
        dateEntries.forEach((entry) => newSet.add(entry.id));
      }

      // Exit selection mode if no items selected
      if (newSet.size === 0) {
        setIsSelectionMode(false);
      }
      return newSet;
    });
  }, []);

  const isAllSelectedInDate = useCallback(
    (dateEntries: HistoryEntry[]) => {
      return dateEntries.every((entry) => selectedIds.has(entry.id));
    },
    [selectedIds],
  );

  const getCurrentIndex = useCallback(() => {
    if (!selectedEntry) return -1;
    return entries.findIndex((e) => e.id === selectedEntry.id);
  }, [selectedEntry, entries]);

  const showEmpty = !loading && entries.length === 0;
  const isLoggedIn = !!user;

  // Helper to get color score from analysis data
  const getColorScore = (entry: HistoryEntry) => {
    if (entry.color_analysis?.color_stats?.[0]?.combined_std !== undefined) {
      const score = Math.min(
        100,
        Math.max(
          0,
          100 *
            Math.exp(-entry.color_analysis.color_stats[0].combined_std / 35),
        ),
      );
      return score.toFixed(1);
    }
    return entry.color_analysis?.consistency_score?.toFixed(1) || "N/A";
  };

  // Get quality grade from entry
  const getEntryGrade = (entry: HistoryEntry) => {
    return (
      entry.quality_grade || entry.color_analysis?.quality_grade || "Unknown"
    );
  };

  // If viewing a specific entry, show full-screen view with horizontal swipe
  if (selectedEntry) {
    const formattedTimestamp = new Date(
      selectedEntry.timestamp,
    ).toLocaleString();
    const currentIndex = getCurrentIndex();
    const screenWidth = Dimensions.get("window").width;
    const screenHeight = Dimensions.get("window").height;

    // Check if entry has analysis data
    // Check if entry has analysis data - be lenient, check detections exist
    const hasAnalysisData =
      selectedEntry.is_daing_detected ||
      (selectedEntry.detections && selectedEntry.detections.length > 0);

    const renderFullscreenItem = ({ item }: { item: HistoryEntry }) => {
      return (
        <View
          style={{
            width: screenWidth,
            height: screenHeight - 180, // Account for header and bottom bar
            backgroundColor: theme.colors.background,
          }}
        >
          <ZoomableImage
            uri={item.url}
            style={{
              width: screenWidth,
              height: screenHeight - 180,
            }}
          />
        </View>
      );
    };

    // Get current entry's analysis data for the overlay
    const currentEntry = selectedEntry;
    const currentHasAnalysis =
      currentEntry.is_daing_detected ||
      (currentEntry.detections && currentEntry.detections.length > 0);
    const currentDetection = currentEntry.detections?.[0];
    const currentMoldResult = currentEntry.mold_analysis?.fish_results?.[0];

    // Debug: log the selected entry's analysis data
    console.log("🔍 Selected entry analysis data:", {
      entryId: currentEntry.id,
      is_daing_detected: currentEntry.is_daing_detected,
      detectionsCount: currentEntry.detections?.length || 0,
      hasColorAnalysis: !!currentEntry.color_analysis,
      hasMoldAnalysis: !!currentEntry.mold_analysis,
      currentHasAnalysis,
      rawEntry: JSON.stringify(currentEntry).substring(0, 500),
    });

    return (
      <View style={commonStyles.container}>
        <View style={commonStyles.screenHeader}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setSelectedEntry(null)}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={commonStyles.screenTitle}>{formattedTimestamp}</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => confirmDelete(selectedEntry)}
          >
            <Ionicons
              name="trash-outline"
              size={22}
              color={theme.colors.error}
            />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, position: "relative" }}>
          <FlatList
            ref={flatListRef}
            data={entries}
            renderItem={renderFullscreenItem}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={currentIndex >= 0 ? currentIndex : 0}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              // Handle scroll failure gracefully
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: false,
                });
              }, 100);
            }}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(
                event.nativeEvent.contentOffset.x / screenWidth,
              );
              if (
                entries[newIndex] &&
                entries[newIndex].id !== selectedEntry?.id
              ) {
                setSelectedEntry(entries[newIndex]);
              }
            }}
            style={{ flex: 1 }}
            contentContainerStyle={{ alignItems: "center" }}
            snapToInterval={screenWidth}
            snapToAlignment="start"
            decelerationRate="fast"
          />

          {/* Analysis Overlay - always show, with fallbacks for missing data */}
          <View style={styles.detailsOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={[
                styles.detailsToggle,
                !detailsExpanded && styles.detailsToggleCollapsed,
              ]}
              onPress={() => setDetailsExpanded(!detailsExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.detailsToggleText}>Analysis Details</Text>
              <Ionicons
                name={detailsExpanded ? "chevron-down" : "chevron-up"}
                size={20}
                color={theme.colors.text}
              />
            </TouchableOpacity>

            {detailsExpanded && (
              <View style={styles.detailsCard}>
                {currentHasAnalysis ? (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type:</Text>
                      <Text style={styles.detailValue}>
                        {currentDetection?.fish_type || "Unknown"}{" "}
                        <Text style={styles.confidence}>
                          {((currentDetection?.confidence || 0) * 100).toFixed(
                            0,
                          )}
                          %
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Color:</Text>
                      <Text style={styles.detailValue}>
                        {getColorScore(currentEntry)}%
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.gradeBadge,
                        {
                          backgroundColor:
                            getGradeColor(getEntryGrade(currentEntry)) + "20",
                        },
                      ]}
                    >
                      <Text style={styles.detailLabel}>Grade:</Text>
                      <Text
                        style={[
                          styles.gradeText,
                          { color: getGradeColor(getEntryGrade(currentEntry)) },
                        ]}
                      >
                        {getEntryGrade(currentEntry)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Mold:</Text>
                      <Text style={styles.detailValue}>
                        {currentMoldResult?.mold_coverage_percent?.toFixed(1) ||
                          currentEntry.mold_analysis?.avg_coverage_percent?.toFixed(
                            1,
                          ) ||
                          "0.0"}
                        %
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.severityBadge,
                        {
                          backgroundColor:
                            getSeverityColor(
                              currentMoldResult?.severity ||
                                currentEntry.mold_analysis?.overall_severity ||
                                "None",
                            ) + "20",
                        },
                      ]}
                    >
                      <Text style={styles.detailLabel}>Severity:</Text>
                      <Text
                        style={[
                          styles.severityText,
                          {
                            color: getSeverityColor(
                              currentMoldResult?.severity ||
                                currentEntry.mold_analysis?.overall_severity ||
                                "None",
                            ),
                          },
                        ]}
                      >
                        {currentMoldResult?.severity ||
                          currentEntry.mold_analysis?.overall_severity ||
                          "None"}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.noDataRow}>
                    <Text style={styles.noDataText}>
                      No analysis data available for this scan.
                    </Text>
                    <Text style={styles.noDataHint}>
                      Re-scan the image to generate analysis.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={commonStyles.bottomButtonBar}>
          <TouchableOpacity
            style={[commonStyles.bottomButton, styles.secondaryButton]}
            onPress={() => setSelectedEntry(null)}
          >
            <Ionicons name="close" size={20} color={theme.colors.text} />
            <Text style={commonStyles.bottomButtonText}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[commonStyles.bottomButton, styles.dangerButton]}
            onPress={() => confirmDelete(selectedEntry)}
            disabled={isDeleting}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={theme.colors.text}
            />
            <Text style={commonStyles.bottomButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {/* Deletion Loading Overlay */}
      {isDeleting && (
        <View style={historyStyles.deletionOverlay}>
          <View style={historyStyles.deletionCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={historyStyles.deletionText}>
              Deleting{" "}
              {selectedIds.size > 0
                ? `${selectedIds.size} photo${selectedIds.size > 1 ? "s" : ""}`
                : "photo"}
              ...
            </Text>
          </View>
        </View>
      )}

      <View style={commonStyles.screenHeader}>
        {isSelectionMode ? (
          <>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={cancelSelection}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={commonStyles.screenTitle}>
              {selectedIds.size} selected
            </Text>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleBatchDelete}
              disabled={isDeleting}
            >
              <Ionicons
                name="trash-outline"
                size={22}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => onNavigate("home")}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={commonStyles.screenTitle}>History</Text>
            <View style={{ width: 40 }} />
          </>
        )}
      </View>

      {/* Tab Bar for Admin Users */}
      {isAdmin && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "my" && styles.activeTab]}
            onPress={() => setActiveTab("my")}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={
                activeTab === "my"
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "my" && styles.activeTabText,
              ]}
            >
              My History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "all" && styles.activeTab]}
            onPress={() => setActiveTab("all")}
          >
            <Ionicons
              name="people-outline"
              size={18}
              color={
                activeTab === "all"
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "all" && styles.activeTabText,
              ]}
            >
              All History
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={historyStyles.contentWrapper}>
        {!isLoggedIn ? (
          // Not logged in - show login prompt
          <View style={historyStyles.emptyStateWrapper}>
            <View style={historyStyles.emptyIcon}>
              <Ionicons
                name="lock-closed-outline"
                size={48}
                color={theme.colors.textMuted}
              />
            </View>
            <Text style={historyStyles.emptyTitle}>Login to see History</Text>
            <Text style={historyStyles.emptySubtitle}>
              Sign in to view and manage your scan history.
            </Text>
            <TouchableOpacity
              style={[
                commonStyles.refreshButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => onNavigate("login")}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={[commonStyles.refreshButtonText, { color: "#fff" }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        ) : loading && entries.length === 0 ? (
          <View style={historyStyles.loadingCenter}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={historyStyles.loadingText}>Loading History...</Text>
          </View>
        ) : showEmpty ? (
          <View style={historyStyles.emptyStateWrapper}>
            <View style={historyStyles.emptyIcon}>
              <Ionicons
                name="time-outline"
                size={48}
                color={theme.colors.textMuted}
              />
            </View>
            <Text style={historyStyles.emptyTitle}>No scans yet</Text>
            <Text style={historyStyles.emptySubtitle}>
              Scan fish to see your previous analyses here.
            </Text>
            <TouchableOpacity
              style={commonStyles.refreshButton}
              onPress={loadHistory}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color={theme.colors.text} />
              <Text style={commonStyles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadHistory} />
            }
            contentContainerStyle={historyStyles.scrollContent}
          >
            {sections.map((section) => {
              // Get all entries for this date section
              const allEntriesInSection = section.rows.flat();
              const allSelectedInSection =
                isAllSelectedInDate(allEntriesInSection);

              return (
                <View key={section.isoDate} style={historyStyles.dateSection}>
                  <View style={historyStyles.dateSectionHeader}>
                    <Text style={historyStyles.dateHeader}>
                      {section.formattedDate}
                    </Text>
                    {isSelectionMode && (
                      <TouchableOpacity
                        onPress={() =>
                          handleSelectAllInDate(allEntriesInSection)
                        }
                        style={[
                          historyStyles.selectAllButton,
                          !allSelectedInSection &&
                            historyStyles.selectAllButtonInactive,
                        ]}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={
                            allSelectedInSection
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={16}
                          color={
                            allSelectedInSection
                              ? theme.colors.text
                              : theme.colors.primary
                          }
                        />
                        <Text
                          style={[
                            historyStyles.selectAllText,
                            !allSelectedInSection &&
                              historyStyles.selectAllTextInactive,
                          ]}
                        >
                          {allSelectedInSection ? "Deselect" : "Select All"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {section.rows.map((row, rowIndex) => (
                    <View
                      key={`${section.isoDate}-row-${rowIndex}`}
                      style={historyStyles.gridRow}
                    >
                      {row.map((entry) => {
                        const isSelected = selectedIds.has(entry.id);
                        return (
                          <TouchableOpacity
                            key={entry.id}
                            style={[
                              historyStyles.square,
                              { width: photoSize, height: photoSize },
                            ]}
                            onPress={() => handleImagePress(entry)}
                            onLongPress={() => handleLongPress(entry)}
                            delayLongPress={400}
                            activeOpacity={0.85}
                          >
                            <Image
                              source={{ uri: entry.url }}
                              style={historyStyles.squareImage}
                            />
                            {isSelectionMode && (
                              <View
                                style={[
                                  historyStyles.selectionCheckbox,
                                  isSelected &&
                                    historyStyles.selectionCheckboxActive,
                                ]}
                              >
                                {isSelected && (
                                  <Ionicons
                                    name="checkmark"
                                    size={16}
                                    color={theme.colors.text}
                                  />
                                )}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                      {row.length < NUM_COLUMNS &&
                        Array.from({ length: NUM_COLUMNS - row.length }).map(
                          (_, idx) => (
                            <View
                              key={`spacer-${idx}`}
                              style={[
                                historyStyles.square,
                                historyStyles.squareSpacer,
                                { width: photoSize, height: photoSize },
                              ]}
                            />
                          ),
                        )}
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        )}
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
  secondaryButton: {
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    gap: 8,
  },
  dangerButton: {
    backgroundColor: theme.colors.error,
    flexDirection: "row",
    gap: 8,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundLight,
    gap: 6,
  },
  activeTab: {
    backgroundColor: `${theme.colors.primary}20`,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  // Details Overlay Styles
  detailsOverlay: {
    position: "absolute",
    bottom: 8,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
  },
  detailsToggleCollapsed: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 1,
  },
  detailsToggleText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  detailsCard: {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.colors.border,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  confidence: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: "400",
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  severityText: {
    fontSize: 14,
    fontWeight: "700",
  },
  noDataRow: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 8,
  },
  noDataText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  noDataHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
});
