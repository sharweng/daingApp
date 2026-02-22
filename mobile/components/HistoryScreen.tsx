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
import { commonStyles, theme } from "../styles/common";
import { historyStyles } from "../styles/history";
import { ZoomableImage } from "./ZoomableImage";
import type { Screen, HistoryEntry, User } from "../types";
import {
  fetchHistory,
  deleteHistoryEntry,
  fetchAllHistory,
} from "../services/api";

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

  // If viewing a specific entry, show full-screen view with horizontal swipe
  if (selectedEntry) {
    const formattedTimestamp = new Date(
      selectedEntry.timestamp,
    ).toLocaleString();
    const currentIndex = getCurrentIndex();
    const screenWidth = Dimensions.get("window").width;
    const screenHeight = Dimensions.get("window").height;

    const renderFullscreenItem = ({ item }: { item: HistoryEntry }) => (
      <View
        style={{
          width: screenWidth,
          height: screenHeight - 180, // Account for header and bottom bar
          justifyContent: "center",
          alignItems: "center",
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
});
