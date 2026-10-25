import { useMemo, useState } from "react";
import { Link, useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { NamePromptModal } from "../../components/NamePromptModal";
import { useTheme } from "../../contexts/ThemeContext";
import { useTemplates } from "../../hooks/useTemplates";
import type { ThemeColors } from "../../lib/theme";

export default function TemplatesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { templates, loading, create } = useTemplates();
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const handleCreate = async (name: string) => {
    setCreating(false);
    const template = await create(name);
    router.push(`/template/${template.id}`);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>No templates yet — create one to get started.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Link href={`/template/${item.id}`} asChild>
            <Pressable style={styles.row}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSubtitle}>
                {item.exerciseCount} exercise{item.exerciseCount === 1 ? "" : "s"}
              </Text>
            </Pressable>
          </Link>
        )}
      />

      <Pressable style={styles.fab} onPress={() => setCreating(true)}>
        <Text style={styles.fabText}>+ New Template</Text>
      </Pressable>

      <NamePromptModal
        visible={creating}
        title="New Template"
        submitLabel="Create"
        onCancel={() => setCreating(false)}
        onSubmit={handleCreate}
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
      position: "absolute",
      right: 16,
      bottom: 24,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 24,
    },
    fabText: { color: colors.primaryText, fontWeight: "600" },
  });
}
