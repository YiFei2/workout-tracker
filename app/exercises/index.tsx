import { useMemo, useState } from "react";
import { Stack } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NamePromptModal } from "../../components/NamePromptModal";
import { useTheme } from "../../contexts/ThemeContext";
import { useExercises } from "../../hooks/useExercises";
import type { ThemeColors } from "../../lib/theme";
import type { Exercise } from "../../types";

export default function ExercisesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const { exercises, loading, create, rename } = useExercises();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Exercise | null>(null);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Exercises" }} />

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>No exercises yet — add one to get started.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => setRenaming(item)}>
            <Text style={styles.rowTitle}>{item.name}</Text>
          </Pressable>
        )}
      />

      <Pressable
        style={[styles.fab, { marginBottom: 16 + insets.bottom }]}
        onPress={() => setCreating(true)}
      >
        <Text style={styles.fabText}>+ Add Exercise</Text>
      </Pressable>

      <NamePromptModal
        visible={creating}
        title="New Exercise"
        submitLabel="Add"
        onCancel={() => setCreating(false)}
        onSubmit={async (name) => {
          setCreating(false);
          await create(name);
        }}
      />

      <NamePromptModal
        visible={renaming !== null}
        title="Rename Exercise"
        initialValue={renaming?.name ?? ""}
        submitLabel="Save"
        onCancel={() => setRenaming(null)}
        onSubmit={async (name) => {
          if (!renaming) return;
          setRenaming(null);
          await rename(renaming.id, name);
        }}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { flexGrow: 1, padding: 16, gap: 10 },
    row: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: 10,
      padding: 14,
    },
    rowTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
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
    fabText: { color: colors.primaryText, fontWeight: "600" },
  });
}
