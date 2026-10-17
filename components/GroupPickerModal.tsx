import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { OverlayModal } from "./OverlayModal";
import { useTheme } from "../contexts/ThemeContext";
import { createExerciseGroup } from "../db";
import type { ThemeColors } from "../lib/theme";
import type { ExerciseGroup } from "../types";

interface Props {
  visible: boolean;
  title?: string;
  groups: ExerciseGroup[];
  selectedId?: string | null;
  emptyText?: string;
  onSelect: (group: ExerciseGroup) => void;
  onCancel: () => void;
}

// Searchable substitution-group picker, mirroring ExercisePickerModal: filters
// the given groups by name as you type, with an inline "+ Create group
// '<query>' and link it" row when nothing matches — lets you link to a brand
// new group without leaving the exercise/template/session screen that opened
// this picker.
export function GroupPickerModal({
  visible,
  title = "Link substitution group",
  groups,
  selectedId = null,
  emptyText = "No groups yet — type a name below to create one.",
  onSelect,
  onCancel,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const trimmedQuery = query.trim();
  const filtered = useMemo(() => {
    if (!trimmedQuery) {
      return groups;
    }
    const lower = trimmedQuery.toLowerCase();
    return groups.filter((group) => group.name.toLowerCase().includes(lower));
  }, [groups, trimmedQuery]);

  const hasExactMatch = groups.some((group) => group.name.toLowerCase() === trimmedQuery.toLowerCase());

  const handleClose = () => {
    setQuery("");
    onCancel();
  };

  const handleSelect = (group: ExerciseGroup) => {
    setQuery("");
    onSelect(group);
  };

  const handleCreate = async () => {
    if (creating) {
      return;
    }
    setCreating(true);
    try {
      const group = await createExerciseGroup(trimmedQuery);
      setQuery("");
      onSelect(group);
    } finally {
      setCreating(false);
    }
  };

  return (
    <OverlayModal visible={visible} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search groups…"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          >
            {trimmedQuery && !hasExactMatch ? (
              <Pressable style={styles.addRow} onPress={handleCreate} disabled={creating}>
                <Text style={styles.addRowText}>
                  + Create group &quot;{trimmedQuery}&quot; and link it
                </Text>
              </Pressable>
            ) : null}

            {filtered.length === 0 && (!trimmedQuery || hasExactMatch) ? (
              <Text style={styles.emptyText}>{emptyText}</Text>
            ) : (
              filtered.map((group) => {
                const active = group.id === selectedId;
                return (
                  <Pressable
                    key={group.id}
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => handleSelect(group)}
                  >
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>{group.name}</Text>
                      <Text style={styles.rowSublabel}>
                        {group.members.length} exercise{group.members.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                    {active ? <Text style={styles.checkmark}>✓</Text> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={handleClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </OverlayModal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "center",
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      gap: 12,
      maxHeight: "80%",
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
    },
    list: { flexGrow: 0 },
    listContent: { gap: 8 },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceMuted,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    rowActive: { borderWidth: 1, borderColor: colors.primary },
    rowText: { flex: 1, gap: 2 },
    rowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
    rowSublabel: { fontSize: 12, color: colors.textMuted },
    checkmark: { color: colors.primary, fontSize: 16, fontWeight: "700", marginLeft: 8 },
    addRow: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    addRowText: { color: colors.primaryText, fontWeight: "600", fontSize: 14 },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    button: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    buttonText: {
      color: colors.text,
    },
  });
}
