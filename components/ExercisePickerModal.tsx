import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { OverlayModal } from "./OverlayModal";
import { useTheme } from "../contexts/ThemeContext";
import { useExercises } from "../hooks/useExercises";
import type { ThemeColors } from "../lib/theme";
import type { Exercise } from "../types";

interface Props {
  visible: boolean;
  title?: string;
  selectedId?: string | null;
  onSelect: (exercise: Exercise) => void;
  onCancel: () => void;
}

// Searchable exercise picker: filters the library by name as you type, with
// an inline "+ Add '<query>' as new exercise" row when nothing matches —
// one unified flow for picking an existing exercise or adding a custom one,
// no separate management screen (see backlog.md "Exercise library").
export function ExercisePickerModal({
  visible,
  title = "Choose Exercise",
  selectedId = null,
  onSelect,
  onCancel,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { exercises, create, refresh } = useExercises();

  // useExercises() only refetches on screen focus, but this picker can be
  // one of several independent instances mounted on the same screen at once
  // (e.g. "Add Exercise" and "Edit Exercise" each nest their own). Re-fetch
  // on open so a custom exercise created via a sibling instance shows up
  // here without needing to navigate away and back.
  useEffect(() => {
    if (visible) {
      refresh();
    }
  }, [visible, refresh]);

  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim();
  const filtered = useMemo(() => {
    if (!trimmedQuery) {
      return exercises;
    }
    const lower = trimmedQuery.toLowerCase();
    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(lower));
  }, [exercises, trimmedQuery]);

  const hasExactMatch = exercises.some(
    (exercise) => exercise.name.toLowerCase() === trimmedQuery.toLowerCase(),
  );

  const handleClose = () => {
    setQuery("");
    onCancel();
  };

  const handleSelect = (exercise: Exercise) => {
    setQuery("");
    onSelect(exercise);
  };

  const [creating, setCreating] = useState(false);

  const handleAddNew = async () => {
    if (creating) {
      return;
    }
    setCreating(true);
    try {
      const exercise = await create(trimmedQuery);
      setQuery("");
      onSelect(exercise);
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
            placeholder="Search exercises…"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          >
            {trimmedQuery && !hasExactMatch ? (
              <Pressable style={styles.addRow} onPress={handleAddNew} disabled={creating}>
                <Text style={styles.addRowText}>+ Add &quot;{trimmedQuery}&quot; as new exercise</Text>
              </Pressable>
            ) : null}

            {filtered.length === 0 && (!trimmedQuery || hasExactMatch) ? (
              <Text style={styles.emptyText}>No exercises found.</Text>
            ) : (
              filtered.map((exercise) => {
                const active = exercise.id === selectedId;
                return (
                  <Pressable
                    key={exercise.id}
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => handleSelect(exercise)}
                  >
                    <Text style={styles.rowLabel}>{exercise.name}</Text>
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
    rowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
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
