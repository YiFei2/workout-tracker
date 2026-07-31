import { useMemo, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ExerciseFormModal, type ExerciseFormValues } from "../../components/ExerciseFormModal";
import { PickerModal } from "../../components/PickerModal";
import { RestTimerOverlay } from "../../components/RestTimerOverlay";
import { SetRow, SetRowHeader } from "../../components/SetRow";
import { useTheme } from "../../contexts/ThemeContext";
import { useExerciseGroups } from "../../hooks/useExerciseGroups";
import { useLocations } from "../../hooks/useLocations";
import { useRestTimer } from "../../hooks/useRestTimer";
import { useSession } from "../../hooks/useSession";
import type { ThemeColors } from "../../lib/theme";
import type { LoggedExercise, WorkoutSet } from "../../types";

const NO_LOCATION_ID = "__none__";

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
    swapExercise,
    setLocation,
    complete,
    discard,
  } = useSession(id);
  const { timer, start, adjust, dismiss, adjustStep } = useRestTimer();
  const { locations } = useLocations();
  const { groups } = useExerciseGroups();
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const [addingExercise, setAddingExercise] = useState(false);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [swappingExercise, setSwappingExercise] = useState<LoggedExercise | null>(null);

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
  const currentLocation = locations.find((location) => location.id === session.locationId) ?? null;

  const handleSelectLocation = async (locationId: string) => {
    setPickingLocation(false);
    await setLocation(locationId === NO_LOCATION_ID ? null : locationId);
  };

  const handleSelectSwap = async (exerciseName: string) => {
    const exercise = swappingExercise;
    setSwappingExercise(null);
    if (!exercise || exerciseName === exercise.exerciseName) return;
    await swapExercise(exercise.id, exerciseName);
  };

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

      {!readOnly || currentLocation ? (
        <Pressable
          style={styles.locationRow}
          onPress={() => setPickingLocation(true)}
          disabled={readOnly}
        >
          <Text style={styles.locationText}>
            📍 {currentLocation ? currentLocation.name : "Set location"}
          </Text>
        </Pressable>
      ) : null}

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
              {!readOnly && exercise.exerciseGroupId && (
                <Pressable
                  style={styles.swapButton}
                  onPress={() => setSwappingExercise(exercise)}
                  hitSlop={8}
                >
                  <Text style={styles.swapButtonText}>⇄ Swap</Text>
                </Pressable>
              )}
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

      <PickerModal
        visible={pickingLocation}
        title="Session Location"
        items={[
          { id: NO_LOCATION_ID, label: "No location" },
          ...locations.map((location) => ({ id: location.id, label: location.name })),
        ]}
        selectedId={session.locationId ?? NO_LOCATION_ID}
        onSelect={handleSelectLocation}
        onCancel={() => setPickingLocation(false)}
      />

      <PickerModal
        visible={swappingExercise !== null}
        title="Swap Exercise"
        items={
          swappingExercise?.exerciseGroupId
            ? (groupsById.get(swappingExercise.exerciseGroupId)?.members ?? []).map((member) => ({
                id: member.exerciseName,
                label: member.exerciseName,
              }))
            : []
        }
        selectedId={swappingExercise?.exerciseName ?? null}
        onSelect={handleSelectSwap}
        onCancel={() => setSwappingExercise(null)}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
    emptyText: { textAlign: "center", color: colors.textMuted, marginTop: 20 },
    locationRow: {
      alignSelf: "flex-start",
      paddingVertical: 4,
    },
    locationText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
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
    swapButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    swapButtonText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
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
