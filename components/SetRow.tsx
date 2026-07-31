import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export interface SetRowValues {
  reps: number;
  weight: number;
}

interface Props {
  index: number;
  reps: number;
  weight: number;
  /** Omit for entities with no completion concept (e.g. template sets). */
  completed?: boolean;
  readOnly?: boolean;
  onUpdate: (patch: Partial<SetRowValues>) => void;
  onToggleCompleted?: () => void;
  onRemove: () => void;
}

export function SetRow({
  index,
  reps: repsValue,
  weight: weightValue,
  completed,
  readOnly = false,
  onUpdate,
  onToggleCompleted,
  onRemove,
}: Props) {
  const [reps, setReps] = useState(String(repsValue));
  const [weight, setWeight] = useState(String(weightValue));

  useEffect(() => {
    setReps(String(repsValue));
  }, [repsValue]);

  useEffect(() => {
    setWeight(String(weightValue));
  }, [weightValue]);

  const commitReps = () => {
    const parsed = Number(reps);
    if (Number.isFinite(parsed) && parsed > 0) {
      onUpdate({ reps: parsed });
    } else {
      setReps(String(repsValue));
    }
  };

  const commitWeight = () => {
    const parsed = Number(weight);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onUpdate({ weight: parsed });
    } else {
      setWeight(String(weightValue));
    }
  };

  if (readOnly) {
    return (
      <View style={styles.setRow}>
        <Text style={styles.setLabel}>Set {index + 1}</Text>
        <Text style={styles.setReadOnlyText}>
          {repsValue} reps @ {weightValue}kg
        </Text>
        {completed !== undefined ? (
          <Text style={styles.setReadOnlyText}>{completed ? "Done" : "—"}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.setRow}>
      <Text style={styles.setLabel}>Set {index + 1}</Text>
      <TextInput
        style={styles.setInput}
        value={reps}
        onChangeText={setReps}
        onEndEditing={commitReps}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.setInput}
        value={weight}
        onChangeText={setWeight}
        onEndEditing={commitWeight}
        keyboardType="numeric"
      />
      {onToggleCompleted ? (
        <Pressable
          style={[styles.doneButton, completed && styles.doneButtonActive]}
          onPress={onToggleCompleted}
        >
          <Text style={[styles.doneButtonText, completed && styles.doneButtonTextActive]}>
            {completed ? "✓" : "Done"}
          </Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.removeButton} onPress={onRemove} hitSlop={8}>
        <Text style={styles.removeButtonText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "white",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  setLabel: { width: 48, fontSize: 13, color: "#666" },
  setReadOnlyText: { fontSize: 14 },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: "center",
  },
  doneButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#e5e7eb",
  },
  doneButtonActive: { backgroundColor: "#16a34a" },
  doneButtonText: { fontSize: 13, fontWeight: "600", color: "#333" },
  doneButtonTextActive: { color: "white" },
  removeButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  removeButtonText: { color: "#999", fontSize: 16 },
});
