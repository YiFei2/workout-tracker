import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import type { ThemeColors } from "../lib/theme";

export interface ExerciseFormValues {
  exerciseName: string;
  restSeconds: number | null;
}

interface Props {
  visible: boolean;
  title: string;
  submitLabel?: string;
  initialValues?: ExerciseFormValues;
  onCancel: () => void;
  onSubmit: (values: ExerciseFormValues) => void;
}

const EMPTY_VALUES: ExerciseFormValues = {
  exerciseName: "",
  restSeconds: 90,
};

export function ExerciseFormModal({
  visible,
  title,
  submitLabel = "Save",
  initialValues,
  onCancel,
  onSubmit,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [exerciseName, setExerciseName] = useState("");
  const [restSeconds, setRestSeconds] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      const values = initialValues ?? EMPTY_VALUES;
      setExerciseName(values.exerciseName);
      setRestSeconds(values.restSeconds === null ? "" : String(values.restSeconds));
      setError(null);
    }
  }, [visible, initialValues]);

  const handleSubmit = () => {
    const trimmedName = exerciseName.trim();
    if (!trimmedName) {
      setError("Exercise name is required");
      return;
    }

    let restSecondsNum: number | null = null;
    if (restSeconds.trim() !== "") {
      const parsed = Number(restSeconds);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Rest time must be zero or a positive number of seconds");
        return;
      }
      restSecondsNum = parsed;
    }

    onSubmit({ exerciseName: trimmedName, restSeconds: restSecondsNum });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.label}>Exercise name</Text>
          <TextInput
            style={styles.input}
            value={exerciseName}
            onChangeText={setExerciseName}
            placeholder="e.g. Bench Press"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <Text style={styles.label}>Rest between sets (seconds, optional)</Text>
          <TextInput
            style={styles.input}
            value={restSeconds}
            onChangeText={setRestSeconds}
            keyboardType="numeric"
            placeholder="e.g. 90"
            placeholderTextColor={colors.textMuted}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.primary]} onPress={handleSubmit}>
              <Text style={styles.primaryText}>{submitLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      padding: 24,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      gap: 10,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    label: {
      fontSize: 12,
      color: colors.textMuted,
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
    error: {
      color: colors.danger,
      fontSize: 13,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: 4,
    },
    button: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    buttonText: {
      color: colors.text,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    primaryText: {
      color: colors.primaryText,
      fontWeight: "600",
    },
  });
}
