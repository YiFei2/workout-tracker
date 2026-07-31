import { useMemo, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ExerciseFormModal, type ExerciseFormValues } from "../../components/ExerciseFormModal";
import { RestTimerOverlay } from "../../components/RestTimerOverlay";
import { SetRow, SetRowHeader } from "../../components/SetRow";
import { useTheme } from "../../contexts/ThemeContext";
import { useRestTimer } from "../../hooks/useRestTimer";
import { useSession } from "../../hooks/useSession";
import type { ThemeColors } from "../../lib/theme";
import type { LoggedExercise, WorkoutSet } from "../../types";

export default function SessionScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
        <Text style={styles.emptyText}>Loading…</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Session not found</Text>
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
    <View style={styles.screen}>
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

            {exercise.sets.length > 0 && <SetRowHeader showCompletedColumn />}

            {exercise.sets.map((set, index) => (
              <SetRow
                key={set.id}
                index={index}
                reps={set.reps}
                weight={set.weight}
                completed={set.completed}
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

      </ScrollView>

      <ExerciseFormModal
        visible={addingExercise}
        title="Add Exercise"
        submitLabel="Add"
        onCancel={() => setAddingExercise(false)}
        onSubmit={handleAddExercise}
      />

      <RestTimerOverlay timer={timer} adjustStep={adjustStep} onAdjust={adjust} onDismiss={dismiss} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
    emptyText: { textAlign: "center", color: colors.textMuted, marginTop: 20 },
    exerciseCard: {
      backgroundColor: colors.surfaceMuted,
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
    exerciseName: { fontSize: 16, fontWeight: "600", color: colors.text },
    exerciseRest: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    removeButton: {
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    removeButtonText: { color: colors.textMuted, fontSize: 16 },
    addSetButton: {
      alignSelf: "flex-start",
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    addSetButtonText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
    addButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
    },
    addButtonText: { color: colors.primaryText, fontWeight: "600" },
    finishRow: {
      flexDirection: "row",
      gap: 12,
    },
    discardButton: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.dangerBg,
    },
    discardButtonText: { color: colors.danger, fontWeight: "700" },
    completeButton: {
      flex: 2,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.success,
    },
    completeButtonText: { color: colors.primaryText, fontWeight: "700" },
  });
}
