import { useMemo, useState } from "react";
import { Stack } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { NamePromptModal } from "../../components/NamePromptModal";
import { useTheme } from "../../contexts/ThemeContext";
import { useLocations } from "../../hooks/useLocations";
import type { ThemeColors } from "../../lib/theme";
import type { Location } from "../../types";

export default function LocationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { locations, loading, create, rename, remove } = useLocations();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Location | null>(null);

  const handleDelete = (location: Location) => {
    Alert.alert("Delete location", `Delete "${location.name}"? Past sessions logged there keep their data but lose this tag.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove(location.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Locations" }} />

      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              No locations yet — add a gym to start tracking weights separately per location.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => setRenaming(item)}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Pressable style={styles.removeButton} onPress={() => handleDelete(item)} hitSlop={8}>
              <Text style={styles.removeButtonText}>✕</Text>
            </Pressable>
          </Pressable>
        )}
      />

      <Pressable style={styles.fab} onPress={() => setCreating(true)}>
        <Text style={styles.fabText}>+ Add Location</Text>
      </Pressable>

      <NamePromptModal
        visible={creating}
        title="New Location"
        submitLabel="Add"
        onCancel={() => setCreating(false)}
        onSubmit={async (name) => {
          setCreating(false);
          await create(name);
        }}
      />

      <NamePromptModal
        visible={renaming !== null}
        title="Rename Location"
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceMuted,
      borderRadius: 10,
      padding: 14,
    },
    rowTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
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
    fabText: { color: colors.primaryText, fontWeight: "600" },
  });
}
