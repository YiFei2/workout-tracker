import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ExercisePickerModal } from "./ExercisePickerModal";
import { OverlayModal } from "./OverlayModal";
import { useTheme } from "../contexts/ThemeContext";
import type { ThemeColors } from "../lib/theme";
import type { Exercise } from "../types";

export interface ExerciseFormValues {
  exerciseId: string;
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
  exerciseId: "",
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

  const [exerciseId, setExerciseId] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [restMinutes, setRestMinutes] = useState("");
  const [restSecondsPart, setRestSecondsPart] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (visible) {
      const values = initialValues ?? EMPTY_VALUES;
      setExerciseId(values.exerciseId);
      setExerciseName(values.exerciseName);
      if (values.restSeconds === null) {
        setRestMinutes("");
        setRestSecondsPart("");
      } else {
        setRestMinutes(String(Math.floor(values.restSeconds / 60)));
        setRestSecondsPart(String(values.restSeconds % 60));
      }
      setError(null);
    }
  }, [visible, initialValues]);

  const handlePickExercise = (exercise: Exercise) => {
    setPicking(false);
    setExerciseId(exercise.id);
    setExerciseName(exercise.name);
  };

  const handleSubmit = () => {
    if (!exerciseId) {
      setError("Choose an exercise");
      return;
    }

    let restSecondsNum: number | null = null;
    if (restMinutes.trim() !== "" || restSecondsPart.trim() !== "") {
      const minutes = restMinutes.trim() === "" ? 0 : Number(restMinutes);
      const seconds = restSecondsPart.trim() === "" ? 0 : Number(restSecondsPart);
      if (!Number.isInteger(minutes) || minutes < 0 || !Number.isInteger(seconds) || seconds < 0 || seconds > 59) {
        setError("Rest time must be a non-negative whole number of minutes, and 0-59 seconds");
        return;
      }
      restSecondsNum = minutes * 60 + seconds;
    }

    onSubmit({ exerciseId, exerciseName, restSeconds: restSecondsNum });
  };

  return (
    <OverlayModal visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.label}>Exercise</Text>
          <Pressable style={styles.pickerButton} onPress={() => setPicking(true)}>
            <Text style={exerciseName ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
              {exerciseName || "Tap to choose an exercise"}
            </Text>
          </Pressable>

          <Text style={styles.label}>Rest between sets (optional)</Text>
          <View style={styles.restRow}>
            <TextInput
              style={styles.restInput}
              value={restMinutes}
              onChangeText={setRestMinutes}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.restUnitLabel}>min</Text>
            <TextInput
              style={styles.restInput}
              value={restSecondsPart}
              onChangeText={setRestSecondsPart}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.restUnitLabel}>sec</Text>
          </View>

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
      </KeyboardAvoidingView>

      <ExercisePickerModal
        visible={picking}
        selectedId={exerciseId}
        onSelect={handlePickExercise}
        onCancel={() => setPicking(false)}
      />
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
    restRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    restInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
      width: 64,
      textAlign: "center",
    },
    restUnitLabel: {
      fontSize: 13,
      color: colors.textMuted,
    },
    pickerButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    pickerButtonText: {
      fontSize: 16,
      color: colors.text,
    },
    pickerButtonPlaceholder: {
      fontSize: 16,
      color: colors.textMuted,
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
