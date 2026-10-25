import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { OverlayModal } from "./OverlayModal";
import { useTheme } from "../contexts/ThemeContext";
import type { ThemeColors } from "../lib/theme";
import type { TaskKind, TaskLinkType } from "../types";

export interface TaskFormValues {
  name: string;
  points: number;
  kind: TaskKind;
  linkType: TaskLinkType | null;
}

interface Props {
  visible: boolean;
  title: string;
  initial?: TaskFormValues;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (values: TaskFormValues) => void;
}

const KIND_OPTIONS: { value: TaskKind; label: string }[] = [
  { value: "repeatable", label: "Repeatable" },
  { value: "oneoff", label: "One-off" },
];

export function TaskFormModal({
  visible,
  title,
  initial,
  submitLabel = "Save",
  onCancel,
  onSubmit,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState("");
  const [points, setPoints] = useState("");
  const [kind, setKind] = useState<TaskKind>("repeatable");
  const [linked, setLinked] = useState(false);

  // Seed the form only on the closed→open transition. Resetting on every
  // render while open (callers pass `initial` as a fresh object literal) would
  // discard in-progress edits if a parent re-render landed mid-edit.
  const wasVisible = useRef(false);
  useEffect(() => {
    if (visible && !wasVisible.current) {
      setName(initial?.name ?? "");
      setPoints(initial ? String(initial.points) : "");
      setKind(initial?.kind ?? "repeatable");
      setLinked(initial?.linkType === "workout");
    }
    wasVisible.current = visible;
  }, [visible, initial]);

  const parsedPoints = Math.floor(Number(points));
  const valid = name.trim().length > 0 && Number.isFinite(parsedPoints) && parsedPoints > 0;

  const handleSubmit = () => {
    if (!valid) {
      return;
    }
    onSubmit({
      name: name.trim(),
      points: parsedPoints,
      kind,
      linkType: linked ? "workout" : null,
    });
  };

  return (
    <OverlayModal visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Go to gym"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <Text style={styles.label}>Points per completion</Text>
          <TextInput
            style={styles.input}
            value={points}
            onChangeText={setPoints}
            placeholder="e.g. 20"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.segmented}>
            {KIND_OPTIONS.map((option) => {
              const active = option.value === kind;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.segment, active && { backgroundColor: colors.primary }]}
                  onPress={() => setKind(option.value)}
                >
                  <Text style={[styles.segmentText, { color: active ? colors.primaryText : colors.text }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchTitle}>Link to workout</Text>
              <Text style={styles.switchHint}>Completing a workout auto-completes this task</Text>
            </View>
            <Switch value={linked} onValueChange={setLinked} />
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.primary, !valid && styles.disabled]}
              onPress={handleSubmit}
              disabled={!valid}
            >
              <Text style={styles.primaryText}>{submitLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </OverlayModal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "center" },
    card: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, gap: 8 },
    title: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 4 },
    label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
    },
    segmented: {
      flexDirection: "row",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      padding: 4,
      gap: 4,
    },
    segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
    segmentText: { fontWeight: "600", fontSize: 14 },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
      gap: 12,
    },
    switchLabel: { flex: 1 },
    switchTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
    switchHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 14 },
    button: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
    buttonText: { color: colors.text },
    primary: { backgroundColor: colors.primary },
    primaryText: { color: colors.primaryText, fontWeight: "600" },
    disabled: { opacity: 0.4 },
  });
}
