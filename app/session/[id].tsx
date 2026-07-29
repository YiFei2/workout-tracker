import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ExerciseFormModal, type ExerciseFormValues } from "../../components/ExerciseFormModal";
import { RestTimerOverlay } from "../../components/RestTimerOverlay";
import { useRestTimer } from "../../hooks/useRestTimer";
import { useSession } from "../../hooks/useSession";
import type { LoggedExercise, WorkoutSet } from "../../types";

interface SetRowProps {
  set: WorkoutSet;
  index: number;
  readOnly: boolean;
  onToggleCompleted: () => void;
  onUpdate: (patch: { reps?: number; weight?: number }) => void;
  onRemove: () => void;
}

function SetRow({ set, index, readOnly, onToggleCompleted, onUpdate, onRemove }: SetRowProps) {
  const [reps, setReps] = useState(String(set.reps));
  const [weight, setWeight] = useState(String(set.weight));

  useEffect(() => {
    setReps(String(set.reps));
  }, [set.reps]);

  useEffect(() => {
    setWeight(String(set.weight));
  }, [set.weight]);

  const commitReps = () => {
    const parsed = Number(reps);
    if (Number.isFinite(parsed) && parsed > 0) {
      onUpdate({ reps: parsed });
    } else {
      setReps(String(set.reps));
    }
  };

  const commitWeight = () => {
    const parsed = Number(weight);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onUpdate({ weight: parsed });
    } else {
      setWeight(String(set.weight));
    }
  };

  if (readOnly) {
    return (
      <View style={styles.setRow}>
        <Text style={styles.setLabel}>Set {index + 1}</Text>
        <Text style={styles.setReadOnlyText}>
          {set.reps} reps @ {set.weight}kg
        </Text>
        <Text style={styles.setReadOnlyText}>{set.completed ? "Done" : "—"}</Text>
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
      <Pressable
        style={[styles.doneButton, set.completed && styles.doneButtonActive]}
        onPress={onToggleCompleted}
      >
        <Text style={[styles.doneButtonText, set.completed && styles.doneButtonTextActive]}>
          {set.completed ? "✓" : "Done"}
        </Text>
      </Pressable>
      <Pressable style={styles.removeButton} onPress={onRemove} hitSlop={8}>
        <Text style={styles.removeButtonText}>✕</Text>
      </Pressable>
    </View>
  );
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    session,
    loading,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
    complete,
    discard,
  } = useSession(id);
  const { timer, start, adjust, dismiss, adjustStep } = useRestTimer();

  const [addingExercise, setAddingExercise] = useState(false);

  if (loading && !session) {
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text>Session not found</Text>
      </View>
    );
  }

  const readOnly = session.completedAt !== null;

  const handleToggleCompleted = async (exercise: LoggedExercise, set: WorkoutSet) => {
    const nextCompleted = !set.completed;
    await updateSet(set.id, { completed: nextCompleted });
    if (nextCompleted && exercise.restSeconds !== null && exercise.restSeconds > 0) {
      start(exercise.restSeconds, exercise.exerciseName);
    }
  };

  const handleRemoveExercise = (exercise: LoggedExercise) => {
    Alert.alert("Remove exercise", `Remove "${exercise.exerciseName}" from this session?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeExercise(exercise.id) },
    ]);
  };

  const handleAddExercise = async (values: ExerciseFormValues) => {
    setAddingExercise(false);
    await addExercise(values);
  };

  const handleComplete = () => {
    Alert.alert("Complete workout", "Save this workout to history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          await complete();
          router.back();
        },
      },
    ]);
  };

  const handleDiscard = () => {
    Alert.alert("Discard workout", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: async () => {
          await discard();
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Stack.Screen options={{ title: session.name }} />

      {session.exercises.length === 0 ? (
        <Text style={styles.emptyText}>No exercises yet — add one below.</Text>
      ) : (
        session.exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseTitleArea}>
                <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                <Text style={styles.exerciseRest}>
                  {exercise.restSeconds !== null ? `Rest: ${exercise.restSeconds}s` : "No rest set"}
                </Text>
              </View>
              {!readOnly && (
                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleRemoveExercise(exercise)}
                  hitSlop={8}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </Pressable>
              )}
            </View>

            {exercise.sets.map((set, index) => (
              <SetRow
                key={set.id}
                set={set}
                index={index}
                readOnly={readOnly}
                onToggleCompleted={() => handleToggleCompleted(exercise, set)}
                onUpdate={(patch) => updateSet(set.id, patch)}
                onRemove={() => removeSet(set.id)}
              />
            ))}

            {!readOnly && (
              <Pressable style={styles.addSetButton} onPress={() => addSet(exercise.id)}>
                <Text style={styles.addSetButtonText}>+ Add Set</Text>
              </Pressable>
            )}
          </View>
        ))
      )}

      {!readOnly && (
        <>
          <Pressable style={styles.addButton} onPress={() => setAddingExercise(true)}>
            <Text style={styles.addButtonText}>+ Add Exercise</Text>
          </Pressable>

          <View style={styles.finishRow}>
            <Pressable style={styles.discardButton} onPress={handleDiscard}>
              <Text style={styles.discardButtonText}>Discard</Text>
            </Pressable>
            <Pressable style={styles.completeButton} onPress={handleComplete}>
              <Text style={styles.completeButtonText}>Complete Workout</Text>
            </Pressable>
          </View>
        </>
      )}

      <ExerciseFormModal
        visible={addingExercise}
        title="Add Exercise"
        submitLabel="Add"
        onCancel={() => setAddingExercise(false)}
        onSubmit={handleAddExercise}
      />

      <RestTimerOverlay timer={timer} adjustStep={adjustStep} onAdjust={adjust} onDismiss={dismiss} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
  emptyText: { textAlign: "center", color: "#666", marginTop: 20 },
  exerciseCard: {
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  exerciseTitleArea: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: "600" },
  exerciseRest: { fontSize: 12, color: "#666", marginTop: 2 },
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
  addSetButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  addSetButtonText: { color: "#2563eb", fontWeight: "600", fontSize: 13 },
  addButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  addButtonText: { color: "white", fontWeight: "600" },
  finishRow: {
    flexDirection: "row",
    gap: 12,
  },
  discardButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fee2e2",
  },
  discardButtonText: { color: "#dc2626", fontWeight: "700" },
  completeButton: {
    flex: 2,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#16a34a",
  },
  completeButtonText: { color: "white", fontWeight: "700" },
});
