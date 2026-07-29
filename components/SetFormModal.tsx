import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export interface SetFormValues {
  reps: number;
  weight: number;
}

interface Props {
  visible: boolean;
  title: string;
  submitLabel?: string;
  initialValues?: SetFormValues;
  onCancel: () => void;
  onSubmit: (values: SetFormValues) => void;
}

const EMPTY_VALUES: SetFormValues = { reps: 10, weight: 0 };

export function SetFormModal({
  visible,
  title,
  submitLabel = "Save",
  initialValues,
  onCancel,
  onSubmit,
}: Props) {
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      const values = initialValues ?? EMPTY_VALUES;
      setReps(String(values.reps));
      setWeight(String(values.weight));
      setError(null);
    }
  }, [visible, initialValues]);

  const handleSubmit = () => {
    const repsNum = Number(reps);
    const weightNum = Number(weight);

    if (!Number.isFinite(repsNum) || repsNum <= 0) {
      setError("Reps must be a positive number");
      return;
    }
    if (!Number.isFinite(weightNum) || weightNum < 0) {
      setError("Weight must be zero or a positive number");
      return;
    }

    onSubmit({ reps: repsNum, weight: weightNum });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Reps</Text>
              <TextInput
                style={styles.input}
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                autoFocus
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
