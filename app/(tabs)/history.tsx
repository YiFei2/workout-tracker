import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { startBlankSession } from "../../db";
import { useSessions } from "../../hooks/useSessions";
import type { ThemeColors } from "../../lib/theme";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { sessions, loading, remove } = useSessions();
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const handleStartBlank = async () => {
    setStarting(true);
    try {
      const session = await startBlankSession();
      router.push(`/session/${session.id}`);
    } finally {
      setStarting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete session", `Delete "${name}" from history?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>No completed workouts yet.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/session/${item.id}`)}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSubtitle}>
                {formatDate(item.startedAt)} · {item.exerciseCount} exercise
                {item.exerciseCount === 1 ? "" : "s"} · {item.completedSetCount} sets completed
                {item.locationName ? ` · ${item.locationName}` : ""}
              </Text>
            </View>
            <Pressable
              style={styles.removeButton}
              onPress={() => handleDelete(item.id, item.name)}
              hitSlop={8}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </Pressable>
          </Pressable>
        )}
      />

      <Pressable
        style={[styles.fab, starting && styles.fabDisabled]}
        onPress={handleStartBlank}
        disabled={starting}
      >
        <Text style={styles.fabText}>{starting ? "Starting…" : "+ Start Blank Workout"}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { flexGrow: 1, padding: 16, gap: 10 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceMuted,
      borderRadius: 10,
      padding: 14,
    },
    rowInfo: { flex: 1, gap: 4 },
    rowTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
    rowSubtitle: { fontSize: 13, color: colors.textMuted },
    removeButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    removeButtonText: { color: colors.textMuted, fontSize: 16 },
    emptyText: {
      textAlign: "center",
      color: colors.textMuted,
      marginTop: 40,
    },
    fab: {
      margin: 16,
      backgroundColor: colors.primary,
      borderRadius: 24,
      paddingVertical: 14,
      alignItems: "center",
    },
    fabDisabled: { opacity: 0.6 },
    fabText: { color: colors.primaryText, fontWeight: "600" },
  });
}
