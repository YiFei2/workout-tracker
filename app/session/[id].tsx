import { useMemo, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExerciseFormModal, type ExerciseFormValues } from "../../components/ExerciseFormModal";
import { ExercisePickerModal } from "../../components/ExercisePickerModal";
import { GroupPickerModal } from "../../components/GroupPickerModal";
import { LocationPickerModal } from "../../components/LocationPickerModal";
import { RestTimerOverlay } from "../../components/RestTimerOverlay";
import { SetRow, SetRowHeader } from "../../components/SetRow";
import { useTheme } from "../../contexts/ThemeContext";
import { setExerciseGroup } from "../../db";
import { useLocations } from "../../contexts/LocationsContext";
import { useExerciseGroups } from "../../hooks/useExerciseGroups";
import { useRestTimer } from "../../hooks/useRestTimer";
import { useSession } from "../../hooks/useSession";
import { formatMinutesSeconds } from "../../lib/time";
import type { ThemeColors } from "../../lib/theme";
import type { Exercise, ExerciseGroup, LoggedExercise, WorkoutSet } from "../../types";

export default function SessionScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    session,
    loading,
    refresh: refreshSession,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
    swapExercise,
    reorderExercises,
    setLocation,
    complete,
    discard,
  } = useSession(id);
  const { timer, start, adjust, dismiss, adjustStep } = useRestTimer();
  const { locations } = useLocations();
  const { groups, refresh: refreshGroups } = useExerciseGroups();
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const [addingExercise, setAddingExercise] = useState(false);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [swappingExercise, setSwappingExercise] = useState<LoggedExercise | null>(null);
  const [linkingGroupFor, setLinkingGroupFor] = useState<LoggedExercise | null>(null);

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
    await setLocation(locationId);
  };

  const handleSelectSwap = async (exercise: Exercise) => {
    const logged = swappingExercise;
    setSwappingExercise(null);
    if (!logged || !logged.exerciseGroupId || exercise.id === logged.exerciseId) return;
    if (exercise.groupId !== logged.exerciseGroupId) {
      await setExerciseGroup(exercise.id, logged.exerciseGroupId);
      await refreshGroups();
    }
    await swapExercise(logged.id, exercise.id, exercise.name);
  };

  const handleSelectGroupLink = async (group: ExerciseGroup) => {
    const exercise = linkingGroupFor;
    setLinkingGroupFor(null);
    if (!exercise) return;
    await setExerciseGroup(exercise.exerciseId, group.id);
    await refreshGroups();
    await refreshSession();
  };

  const handleToggleCompleted = async (exercise: LoggedExercise, set: WorkoutSet) => {
    const nextCompleted = !set.completed;
    await updateSet(set.id, { completed: nextCompleted });
    if (nextCompleted && exercise.restSeconds !== null && exercise.restSeconds > 0) {
      start(exercise.restSeconds, exercise.exerciseName);
    }
  };

  const handleMoveExercise = (exercise: LoggedExercise, direction: -1 | 1) => {
    if (!session) return;
    const ids = session.exercises.map((e) => e.id);
    const index = ids.indexOf(exercise.id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ids.length) return;
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
    reorderExercises(ids);
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
          router.dismissTo("/history");
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

  // While any modal is open, make the screen behind it inert to touch and
  // accessibility tooling — see the matching comment in app/template/[id].tsx.
  const anyModalOpen =
    addingExercise || pickingLocation || swappingExercise !== null || linkingGroupFor !== null;

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.container}
        pointerEvents={anyModalOpen ? "none" : "auto"}
        importantForAccessibility={anyModalOpen ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={anyModalOpen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.bottom : 0}
      >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
        session.exercises.map((exercise, exerciseIndex) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              {!readOnly && (
                <View style={styles.reorderColumn}>
                  <Pressable
                    style={styles.reorderButton}
                    onPress={() => handleMoveExercise(exercise, -1)}
                    disabled={exerciseIndex === 0}
                    hitSlop={8}
                  >
                    <Text
                      style={[styles.reorderButtonText, exerciseIndex === 0 && styles.reorderButtonTextDisabled]}
                    >
                      ▲
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.reorderButton}
                    onPress={() => handleMoveExercise(exercise, 1)}
                    disabled={exerciseIndex === session.exercises.length - 1}
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        styles.reorderButtonText,
                        exerciseIndex === session.exercises.length - 1 && styles.reorderButtonTextDisabled,
                      ]}
                    >
                      ▼
                    </Text>
                  </Pressable>
                </View>
              )}
              <View style={styles.exerciseTitleArea}>
                <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                <Text style={styles.exerciseRest}>
                  {exercise.restSeconds !== null
                    ? `Rest: ${formatMinutesSeconds(exercise.restSeconds)}`
                    : "No rest set"}
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
              {!readOnly && !exercise.exerciseGroupId && (
                <Pressable
                  style={styles.swapButton}
                  onPress={() => setLinkingGroupFor(exercise)}
                  hitSlop={8}
                >
                  <Text style={styles.swapButtonText}>+ Link substitution group</Text>
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
      </KeyboardAvoidingView>

      <ExerciseFormModal
        visible={addingExercise}
        title="Add Exercise"
        submitLabel="Add"
        onCancel={() => setAddingExercise(false)}
        onSubmit={handleAddExercise}
      />

      <RestTimerOverlay timer={timer} adjustStep={adjustStep} onAdjust={adjust} onDismiss={dismiss} />

      <LocationPickerModal
        visible={pickingLocation}
        title="Session Location"
        selectedId={session.locationId}
        onSelect={handleSelectLocation}
        onCancel={() => setPickingLocation(false)}
      />

      <ExercisePickerModal
        visible={swappingExercise !== null}
        title="Swap Exercise"
        exercises={
          swappingExercise?.exerciseGroupId
            ? groupsById.get(swappingExercise.exerciseGroupId)?.members ?? []
            : []
        }
        selectedId={swappingExercise?.exerciseId ?? null}
        onSelect={handleSelectSwap}
        onCancel={() => setSwappingExercise(null)}
      />

      <GroupPickerModal
        visible={linkingGroupFor !== null}
        title="Link substitution group"
        groups={groups}
        onSelect={handleSelectGroupLink}
        onCancel={() => setLinkingGroupFor(null)}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    // Generous bottom padding (not just safe-area + a little) so the
    // ScrollView always has enough trailing scroll room to bring a
    // focused input in the last exercise card fully above the keyboard —
    // see the comment on the KeyboardAvoidingView in the component body.
    scrollContent: { padding: 16, gap: 12, paddingBottom: 320 + bottomInset },
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
    reorderColumn: {
      marginRight: 8,
    },
    reorderButton: {
      paddingVertical: 2,
      paddingHorizontal: 4,
    },
    reorderButtonText: { fontSize: 14, color: colors.textMuted },
    reorderButtonTextDisabled: { opacity: 0.3 },
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
