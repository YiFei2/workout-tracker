import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export interface ExerciseFormValues {
  exerciseName: string;
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number;
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
  defaultSets: 3,
  defaultReps: 10,
  defaultWeight: 0,
};

export function ExerciseFormModal({
  visible,
  title,
  submitLabel = "Save",
  initialValues,
  onCancel,
  onSubmit,
}: Props) {
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      const values = initialValues ?? EMPTY_VALUES;
      setExerciseName(values.exerciseName);
      setSets(String(values.defaultSets));
      setReps(String(values.defaultReps));
      setWeight(String(values.defaultWeight));
      setError(null);
    }
  }, [visible, initialValues]);

  const handleSubmit = () => {
    const trimmedName = exerciseName.trim();
    const setsNum = Number(sets);
    const repsNum = Number(reps);
    const weightNum = Number(weight);

    if (!trimmedName) {
      setError("Exercise name is required");
      return;
    }
    if (!Number.isFinite(setsNum) || setsNum <= 0) {
      setError("Sets must be a positive number");
      return;
    }
    if (!Number.isFinite(repsNum) || repsNum <= 0) {
      setError("Reps must be a positive number");
      return;
    }
    if (!Number.isFinite(weightNum) || weightNum < 0) {
      setError("Weight must be zero or a positive number");
      return;
    }

    onSubmit({
      exerciseName: trimmedName,
      defaultSets: setsNum,
      defaultReps: repsNum,
      defaultWeight: weightNum,
    });
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
            autoFocus
          />

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Sets</Text>
              <TextInput
                style={styles.input}
                value={sets}
                onChangeText={setSets}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Reps</Text>
              <TextInput
                style={styles.input}
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={onCancel}>
              <Text>Cancel</Text>
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  label: {
    fontSize: 12,
    color: "#666",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  field: {
    flex: 1,
    gap: 4,
  },
  error: {
    color: "#dc2626",
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
  primary: {
    backgroundColor: "#2563eb",
  },
  primaryText: {
    color: "white",
    fontWeight: "600",
  },
});
