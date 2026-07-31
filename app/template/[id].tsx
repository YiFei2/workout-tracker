import { useMemo, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ExerciseFormModal, type ExerciseFormValues } from "../../components/ExerciseFormModal";
import { NamePromptModal } from "../../components/NamePromptModal";
import { PickerModal } from "../../components/PickerModal";
import { SetRow, SetRowHeader } from "../../components/SetRow";
import { useTheme } from "../../contexts/ThemeContext";
import { deleteTemplate, startSessionFromTemplate } from "../../db";
import { useExerciseGroups } from "../../hooks/useExerciseGroups";
import { useTemplate } from "../../hooks/useTemplate";
import type { ThemeColors } from "../../lib/theme";
import type { TemplateExercise } from "../../types";

export default function TemplateDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    template,
    loading,
    rename,
    addExercise,
    updateExercise,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
  } = useTemplate(id);
  const { groups } = useExerciseGroups();
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const [renaming, setRenaming] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<TemplateExercise | null>(null);
  const [starting, setStarting] = useState(false);
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

  const handleAddSet = async (exercise: TemplateExercise) => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    await addSet(exercise.id, { reps: lastSet?.reps ?? 10, weight: lastSet?.weight ?? 0 });
  };

  const handleSelectGroup = async (groupId: string) => {
    const exercise = linkingGroupFor;
    setLinkingGroupFor(null);
    if (!exercise) return;
    const group = groupsById.get(groupId);
    const firstMember = group?.members[0];
    if (!firstMember) {
      Alert.alert("Empty group", "Add exercises to this group first (Settings → Exercise Groups).");
      return;
    }
    await updateExercise(exercise.id, { exerciseGroupId: groupId, exerciseName: firstMember.exerciseName });
  };

  const handleSelectMember = async (exerciseName: string) => {
    const exercise = changingMemberFor;
    setChangingMemberFor(null);
    if (!exercise) return;
    await updateExercise(exercise.id, { exerciseName });
  };

  const handleUnlinkGroup = (exercise: TemplateExercise) => {
    Alert.alert("Unlink group", `Stop linking "${exercise.exerciseName}" to a substitution group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlink",
        style: "destructive",
        onPress: () => updateExercise(exercise.id, { exerciseGroupId: null }),
      },
    ]);
  };

  const handleStartWorkout = async () => {
    setStarting(true);
    try {
      const session = await startSessionFromTemplate(template.id);
      router.push(`/session/${session.id}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={styles.screen}>
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

            {exercise.sets.length > 0 && <SetRowHeader />}

            {exercise.sets.map((set, index) => (
              <SetRow
                key={set.id}
                index={index}
                reps={set.reps}
                weight={set.weight}
                onUpdate={(patch) => updateSet(set.id, patch)}
                onRemove={() => removeSet(set.id)}
              />
            ))}

            <Pressable style={styles.addSetButton} onPress={() => handleAddSet(exercise)}>
              <Text style={styles.addSetButtonText}>+ Add Set</Text>
            </Pressable>
          </View>
        ))
      )}

      <Pressable style={styles.addButton} onPress={() => setAddingExercise(true)}>
        <Text style={styles.addButtonText}>+ Add Exercise</Text>
      </Pressable>
      </ScrollView>

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
            ? { exerciseName: editingExercise.exerciseName, restSeconds: editingExercise.restSeconds }
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
                id: member.exerciseName,
                label: member.exerciseName,
              }))
            : []
        }
        selectedId={changingMemberFor?.exerciseName ?? null}
        onSelect={handleSelectMember}
        onCancel={() => setChangingMemberFor(null)}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
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
  });
}
