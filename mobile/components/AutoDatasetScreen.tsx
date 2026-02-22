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
import type { Screen, HistoryEntry } from "../types";
import { fetchAutoDataset, deleteAutoDatasetEntry } from "../services/api";

interface AutoDatasetScreenProps {
  onNavigate: (screen: Screen) => void;
  autoDatasetUrl: string;
}

const NUM_COLUMNS = 3;

export const AutoDatasetScreen: React.FC<AutoDatasetScreenProps> = ({
  onNavigate,
  autoDatasetUrl,
}) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const photoSize = useMemo(() => {
    const screenWidth = Dimensions.get("window").width;
    const horizontalPadding = 32;
    const gapSize = 4;
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

  const loadDataset = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAutoDataset(autoDatasetUrl);
      setEntries(data);
    } catch (error) {
      Alert.alert(
        "Dataset",
        "Unable to load dataset from the server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [autoDatasetUrl]);

  useEffect(() => {
    loadDataset();
  }, [loadDataset]);

  const handleDeleteEntry = useCallback(
    async (entry: HistoryEntry) => {
      if (isDeleting) return;
      setIsDeleting(true);
      try {
        await deleteAutoDatasetEntry(autoDatasetUrl, entry.id);
        setEntries((prev) => prev.filter((item) => item.id !== entry.id));
        setSelectedEntry(null);
      } catch (error) {
        Alert.alert(
          "Delete Failed",
          "We couldn't delete this image. Please try again.",
        );
      } finally {
        setIsDeleting(false);
      }
    },
    [autoDatasetUrl, isDeleting],
  );

  const confirmDelete = useCallback(
    (entry: HistoryEntry) => {
      Alert.alert("Delete Image", "Remove this image from dataset?", [
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
      "Delete Images",
      `Remove ${selectedIds.size} image${selectedIds.size > 1 ? "s" : ""} from dataset?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const deletePromises = Array.from(selectedIds).map((id) =>
                deleteAutoDatasetEntry(autoDatasetUrl, id),
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
                "Some images couldn't be deleted. Please try again.",
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }, [selectedIds, autoDatasetUrl]);

  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleSelectAllInDate = useCallback(
    (dateEntries: HistoryEntry[]) => {
      const allIds = dateEntries.map((e) => e.id);
      const allSelected = allIds.every((id) => selectedIds.has(id));

      if (allSelected) {
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          allIds.forEach((id) => newSet.delete(id));
          if (newSet.size === 0) {
            setIsSelectionMode(false);
          }
          return newSet;
        });
      } else {
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          allIds.forEach((id) => newSet.add(id));
          return newSet;
        });
      }
    },
    [selectedIds],
  );

  const isAllSelectedInDate = useCallback(
    (dateEntries: HistoryEntry[]) => {
      return dateEntries.every((e) => selectedIds.has(e.id));
    },
    [selectedIds],
  );

  const getCurrentIndex = useCallback(() => {
    if (!selectedEntry) return -1;
    return entries.findIndex((e) => e.id === selectedEntry.id);
  }, [selectedEntry, entries]);

  const showEmpty = !loading && entries.length === 0;

  // Full-screen view
  if (selectedEntry) {
    const formattedTimestamp = new Date(
      selectedEntry.timestamp,
    ).toLocaleString();
    const currentIndex = getCurrentIndex();
    const screenWidth = Dimensions.get("window").width;

    const renderFullscreenItem = ({ item }: { item: HistoryEntry }) => (
      <View
        style={{
          width: screenWidth,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ZoomableImage uri={item.url} style={{ width: screenWidth, flex: 1 }} />
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
          initialScrollIndex={currentIndex >= 0 ? currentIndex : undefined}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(
              event.nativeEvent.contentOffset.x / screenWidth,
            );
            if (entries[newIndex]) {
              setSelectedEntry(entries[newIndex]);
            }
          }}
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

  // Deletion overlay
  if (isDeleting) {
    return (
      <View style={commonStyles.container}>
        <View style={historyStyles.deletionOverlay}>
          <View style={historyStyles.deletionCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={historyStyles.deletionText}>
              Deleting {selectedIds.size > 0 ? selectedIds.size : 1} image
              {selectedIds.size > 1 ? "s" : ""}...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Main grid view
  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.screenHeader}>
        {isSelectionMode ? (
          <>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCancelSelection}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={commonStyles.screenTitle}>
              {selectedIds.size} Selected
            </Text>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleBatchDelete}
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
            <Text style={commonStyles.screenTitle}>Auto Dataset</Text>
            <TouchableOpacity style={styles.headerButton} onPress={loadDataset}>
              <Ionicons name="refresh" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={historyStyles.contentWrapper}>
        {loading && entries.length === 0 ? (
          <View style={historyStyles.loadingCenter}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={historyStyles.loadingText}>Loading Dataset...</Text>
          </View>
        ) : showEmpty ? (
          <View style={historyStyles.emptyStateWrapper}>
            <View style={historyStyles.emptyIcon}>
              <Ionicons
                name="folder-open-outline"
                size={48}
                color={theme.colors.textMuted}
              />
            </View>
            <Text style={historyStyles.emptyTitle}>No dataset images</Text>
            <Text style={historyStyles.emptySubtitle}>
              High-confidence scans (85%+) will appear here when auto-save is
              enabled.
            </Text>
            <TouchableOpacity
              style={commonStyles.refreshButton}
              onPress={loadDataset}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color={theme.colors.text} />
              <Text style={commonStyles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadDataset} />
            }
            contentContainerStyle={historyStyles.scrollContent}
          >
            {sections.map((section) => {
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
});
