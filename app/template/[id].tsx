import { useMemo, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExerciseFormModal, type ExerciseFormValues } from "../../components/ExerciseFormModal";
import { LocationPickerModal } from "../../components/LocationPickerModal";
import { NamePromptModal } from "../../components/NamePromptModal";
import { PickerModal } from "../../components/PickerModal";
import { useTheme } from "../../contexts/ThemeContext";
import { deleteTemplate, setExerciseGroup, startSessionFromTemplate } from "../../db";
import { useExerciseGroups } from "../../hooks/useExerciseGroups";
import { useTemplate } from "../../hooks/useTemplate";
import type { ThemeColors } from "../../lib/theme";
import type { TemplateExercise } from "../../types";

export default function TemplateDetailScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    template,
    loading,
    rename,
    addExercise,
    updateExercise,
    removeExercise,
    refresh: refreshTemplate,
  } = useTemplate(id);
  const { groups, refresh: refreshGroups } = useExerciseGroups();
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const [renaming, setRenaming] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<TemplateExercise | null>(null);
  const [starting, setStarting] = useState(false);
  const [pickingStartLocation, setPickingStartLocation] = useState(false);
  const [linkingGroupFor, setLinkingGroupFor] = useState<TemplateExercise | null>(null);
  const [changingMemberFor, setChangingMemberFor] = useState<TemplateExercise | null>(null);

  if (loading && !template) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Loading…</Text>
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Template not found</Text>
      </View>
    );
  }

  const handleDeleteTemplate = () => {
    Alert.alert("Delete template", `Delete "${template.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTemplate(template.id);
          router.back();
        },
      },
    ]);
  };

  const handleRemoveExercise = (exercise: TemplateExercise) => {
    Alert.alert("Remove exercise", `Remove "${exercise.exerciseName}" from this template?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeExercise(exercise.id) },
    ]);
  };

  const handleAddExercise = async (values: ExerciseFormValues) => {
    setAddingExercise(false);
    await addExercise(values);
  };

  const handleEditExercise = async (values: ExerciseFormValues) => {
    if (!editingExercise) {
      return;
    }
    setEditingExercise(null);
    await updateExercise(editingExercise.id, values);
  };

  const handleSelectGroup = async (groupId: string) => {
    const exercise = linkingGroupFor;
    setLinkingGroupFor(null);
    if (!exercise) return;
    await setExerciseGroup(exercise.exerciseId, groupId);
    await refreshGroups();
    await refreshTemplate();
  };

  const handleSelectMember = async (exerciseId: string) => {
    const exercise = changingMemberFor;
    setChangingMemberFor(null);
    if (!exercise || !exercise.exerciseGroupId) return;
    const member = groupsById.get(exercise.exerciseGroupId)?.members.find((m) => m.id === exerciseId);
    if (!member) return;
    await updateExercise(exercise.id, { exerciseId: member.id, exerciseName: member.name });
  };

  const handleUnlinkGroup = (exercise: TemplateExercise) => {
    Alert.alert(
      "Unlink group",
      `Remove "${exercise.exerciseName}" from its substitution group? It will no longer be swappable with the other exercises in that group, anywhere it's used.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: async () => {
            await setExerciseGroup(exercise.exerciseId, null);
            await refreshGroups();
            await refreshTemplate();
          },
        },
      ],
    );
  };

  const handleStartWorkout = () => {
    setPickingStartLocation(true);
  };

  const handleStartLocationSelected = async (locationId: string) => {
    setPickingStartLocation(false);
    setStarting(true);
    try {
      const session = await startSessionFromTemplate(template.id, locationId);
      router.push(`/session/${session.id}`);
    } finally {
      setStarting(false);
    }
  };

  // While any modal is open, make the screen behind it inert to touch and
  // accessibility tooling — otherwise covered elements (e.g. "+ Add
  // Exercise") remain reachable to screen readers/automation despite being
  // visually hidden, and can collide with similarly-worded modal content
  // (e.g. "Add") in text-based selectors.
  const anyModalOpen =
    renaming ||
    addingExercise ||
    editingExercise !== null ||
    pickingStartLocation ||
    linkingGroupFor !== null ||
    changingMemberFor !== null;

  return (
    <View style={styles.screen}>
      <View
        style={styles.container}
        pointerEvents={anyModalOpen ? "none" : "auto"}
        importantForAccessibility={anyModalOpen ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={anyModalOpen}
      >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Stack.Screen options={{ title: template.name }} />

      <View style={styles.header}>
        <Pressable onPress={() => setRenaming(true)}>
          <Text style={styles.templateName}>{template.name}</Text>
          <Text style={styles.renameHint}>Tap to rename</Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={handleDeleteTemplate}>
          <Text style={styles.deleteButtonText}>Delete Template</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.startButton, starting && styles.startButtonDisabled]}
        onPress={handleStartWorkout}
        disabled={starting}
      >
        <Text style={styles.startButtonText}>{starting ? "Starting…" : "Start Workout"}</Text>
      </Pressable>
      <Text style={styles.hintText}>
        Sets, reps, and weight aren't stored on the template — they're loaded from your most
        recent history for each exercise at whichever location you pick when starting.
      </Text>

      {template.exercises.length === 0 ? (
        <Text style={styles.emptyText}>No exercises yet — add one below.</Text>
      ) : (
        template.exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Pressable style={styles.exerciseTitleArea} onPress={() => setEditingExercise(exercise)}>
                <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                <Text style={styles.exerciseRest}>
                  {exercise.restSeconds !== null ? `Rest: ${exercise.restSeconds}s` : "No rest set"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.removeButton}
                onPress={() => handleRemoveExercise(exercise)}
                hitSlop={8}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </Pressable>
            </View>

            {exercise.exerciseGroupId ? (
              <View style={styles.groupRow}>
                <Text style={styles.groupLabel}>
                  Substitutes: {groupsById.get(exercise.exerciseGroupId)?.name ?? "Unknown group"}
                </Text>
                <Pressable onPress={() => setChangingMemberFor(exercise)}>
                  <Text style={styles.groupAction}>Change</Text>
                </Pressable>
                <Pressable onPress={() => handleUnlinkGroup(exercise)}>
                  <Text style={styles.groupAction}>Unlink</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setLinkingGroupFor(exercise)}>
                <Text style={styles.groupAction}>+ Link substitution group</Text>
              </Pressable>
            )}
          </View>
        ))
      )}

      <Pressable style={styles.addButton} onPress={() => setAddingExercise(true)}>
        <Text style={styles.addButtonText}>+ Add Exercise</Text>
      </Pressable>
      </ScrollView>
      </View>

      <NamePromptModal
        visible={renaming}
        title="Rename Template"
        initialValue={template.name}
        submitLabel="Save"
        onCancel={() => setRenaming(false)}
        onSubmit={async (name) => {
          setRenaming(false);
          await rename(name);
        }}
      />

      <ExerciseFormModal
        visible={addingExercise}
        title="Add Exercise"
        submitLabel="Add"
        onCancel={() => setAddingExercise(false)}
        onSubmit={handleAddExercise}
      />

      <ExerciseFormModal
        visible={editingExercise !== null}
        title="Edit Exercise"
        submitLabel="Save"
        initialValues={
          editingExercise
            ? {
                exerciseId: editingExercise.exerciseId,
                exerciseName: editingExercise.exerciseName,
                restSeconds: editingExercise.restSeconds,
              }
            : undefined
        }
        onCancel={() => setEditingExercise(null)}
        onSubmit={handleEditExercise}
      />

      <PickerModal
        visible={linkingGroupFor !== null}
        title="Link substitution group"
        items={groups.map((group) => ({
          id: group.id,
          label: group.name,
          sublabel: `${group.members.length} exercise${group.members.length === 1 ? "" : "s"}`,
        }))}
        emptyText="No groups yet — create one in Settings → Exercise Groups."
        onSelect={handleSelectGroup}
        onCancel={() => setLinkingGroupFor(null)}
      />

      <PickerModal
        visible={changingMemberFor !== null}
        title="Choose default exercise"
        items={
          changingMemberFor?.exerciseGroupId
            ? (groupsById.get(changingMemberFor.exerciseGroupId)?.members ?? []).map((member) => ({
                id: member.id,
                label: member.name,
              }))
            : []
        }
        selectedId={changingMemberFor?.exerciseId ?? null}
        onSelect={handleSelectMember}
        onCancel={() => setChangingMemberFor(null)}
      />

      <LocationPickerModal
        visible={pickingStartLocation}
        title="Start Workout At"
        onSelect={handleStartLocationSelected}
        onCancel={() => setPickingStartLocation(false)}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 40 + bottomInset },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    templateName: { fontSize: 20, fontWeight: "700", color: colors.text },
    renameHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    deleteButton: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: colors.dangerBg,
    },
    deleteButtonText: { color: colors.danger, fontWeight: "600", fontSize: 12 },
    startButton: {
      backgroundColor: colors.success,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
    },
    startButtonDisabled: { opacity: 0.6 },
    startButtonText: { color: colors.primaryText, fontWeight: "700", fontSize: 16 },
    hintText: { fontSize: 12, color: colors.textMuted },
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
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    removeButtonText: { color: colors.textMuted, fontSize: 16 },
    groupRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    groupLabel: { flex: 1, fontSize: 12, color: colors.textMuted },
    groupAction: { fontSize: 12, fontWeight: "600", color: colors.primary },
    addButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
    },
    addButtonText: { color: colors.primaryText, fontWeight: "600" },
  });
}
