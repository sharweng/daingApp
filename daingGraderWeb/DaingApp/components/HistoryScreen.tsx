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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commonStyles } from "../styles/common";
import { historyStyles } from "../styles/history";
import type { Screen, HistoryEntry } from "../types";
import { fetchHistory, deleteHistoryEntry } from "../services/api";

interface HistoryScreenProps {
  onNavigate: (screen: Screen) => void;
  historyUrl: string;
  initialEntry?: HistoryEntry | null;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onNavigate,
  historyUrl,
  initialEntry = null,
}) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(
    initialEntry,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const photoSize = useMemo(() => {
    const screenWidth = Dimensions.get("window").width;
    const horizontalPadding = 40; // scroll padding left + right
    const gapTotal = 20; // gaps between three columns
    return (screenWidth - horizontalPadding - gapTotal) / 3;
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
        rows: chunkEntries(list, 3),
      }));
  }, [entries, chunkEntries]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHistory(historyUrl);
      setEntries(data);
    } catch (error) {
      Alert.alert(
        "History",
        "Unable to load history from the server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [historyUrl]);

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

  const getCurrentIndex = useCallback(() => {
    if (!selectedEntry) return -1;
    return entries.findIndex((e) => e.id === selectedEntry.id);
  }, [selectedEntry, entries]);

  const showEmpty = !loading && entries.length === 0;

  // If viewing a specific entry, show full-screen view with horizontal swipe
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
        }}
      >
        <Image
          source={{ uri: item.url }}
          style={commonStyles.previewImage}
          resizeMode="contain"
        />
      </View>
    );

    return (
      <View style={commonStyles.container}>
        <View style={commonStyles.screenHeader}>
          <TouchableOpacity onPress={() => setSelectedEntry(null)}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={commonStyles.screenTitle}>{formattedTimestamp}</Text>
          <TouchableOpacity onPress={() => confirmDelete(selectedEntry)}>
            <Ionicons name="trash" size={24} color="#f87171" />
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
            style={[commonStyles.bottomButton, { backgroundColor: "#1f2a44" }]}
            onPress={() => setSelectedEntry(null)}
          >
            <Text style={commonStyles.bottomButtonText}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[commonStyles.bottomButton, { backgroundColor: "#dc2626" }]}
            onPress={() => confirmDelete(selectedEntry)}
            disabled={isDeleting}
          >
            <Text style={commonStyles.bottomButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.screenHeader}>
        {isSelectionMode ? (
          <>
            <TouchableOpacity onPress={cancelSelection}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={commonStyles.screenTitle}>
              {selectedIds.size} selected
            </Text>
            <TouchableOpacity onPress={handleBatchDelete} disabled={isDeleting}>
              <Ionicons name="trash" size={24} color="#f87171" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => onNavigate("home")}>
              <Ionicons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>
            <Text style={commonStyles.screenTitle}>History</Text>
            <View style={{ width: 28 }} />
          </>
        )}
      </View>

      <View style={historyStyles.contentWrapper}>
        {loading && entries.length === 0 ? (
          <ActivityIndicator
            size="large"
            color="#3b82f6"
            style={{ marginTop: 40 }}
          />
        ) : showEmpty ? (
          <View style={historyStyles.emptyStateWrapper}>
            <Ionicons name="time-outline" size={72} color="#334155" />
            <Text style={historyStyles.emptyTitle}>No scans yet</Text>
            <Text style={historyStyles.emptySubtitle}>
              Scan fish to see your previous analyses here.
            </Text>
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadHistory} />
            }
            contentContainerStyle={historyStyles.scrollContent}
          >
            {sections.map((section) => (
              <View key={section.isoDate} style={historyStyles.dateSection}>
                <Text style={historyStyles.dateHeader}>
                  {section.formattedDate}
                </Text>
                {section.rows.map((row, rowIndex) => (
                  <View
                    key={`${section.isoDate}-row-${rowIndex}`}
                    style={historyStyles.gridRow}
                  >
                    {row.map((entry, index) => {
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
                          delayLongPress={500}
                          activeOpacity={0.8}
                        >
                          <Image
                            source={{ uri: entry.url }}
                            style={historyStyles.squareImage}
                          />
                          {isSelectionMode && (
                            <View
                              style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: isSelected
                                  ? "#3b82f6"
                                  : "rgba(255,255,255,0.3)",
                                borderWidth: 2,
                                borderColor: "white",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              {isSelected && (
                                <Ionicons
                                  name="checkmark"
                                  size={16}
                                  color="white"
                                />
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    {row.length < 3 &&
                      Array.from({ length: 3 - row.length }).map((_, idx) => (
                        <View
                          key={`spacer-${idx}`}
                          style={[
                            historyStyles.square,
                            historyStyles.squareSpacer,
                            { width: photoSize, height: photoSize },
                          ]}
                        />
                      ))}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};
