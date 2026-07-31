import { useMemo, useState } from "react";
import { Link, Stack } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { NamePromptModal } from "../../components/NamePromptModal";
import { useTheme } from "../../contexts/ThemeContext";
import { useExerciseGroups } from "../../hooks/useExerciseGroups";
import type { ThemeColors } from "../../lib/theme";

export default function ExerciseGroupsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { groups, loading, create } = useExerciseGroups();
  const [creating, setCreating] = useState(false);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Exercise Groups" }} />

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              No groups yet — create one to link interchangeable exercises (e.g. Barbell Bench,
              Dumbbell Bench, Machine Chest Press) so you can swap between them smoothly.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Link href={`/exercise-groups/${item.id}`} asChild>
            <Pressable style={styles.row}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSubtitle}>
                {item.members.length} exercise{item.members.length === 1 ? "" : "s"}
              </Text>
            </Pressable>
          </Link>
        )}
      />

      <Pressable style={styles.fab} onPress={() => setCreating(true)}>
        <Text style={styles.fabText}>+ New Group</Text>
      </Pressable>

      <NamePromptModal
        visible={creating}
        title="New Exercise Group"
        submitLabel="Create"
        onCancel={() => setCreating(false)}
        onSubmit={async (name) => {
          setCreating(false);
          await create(name);
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
      gap: 4,
    },
    rowTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
    rowSubtitle: { fontSize: 13, color: colors.textMuted },
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
