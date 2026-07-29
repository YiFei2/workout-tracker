import { useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ExerciseFormModal, type ExerciseFormValues } from "../../components/ExerciseFormModal";
import { NamePromptModal } from "../../components/NamePromptModal";
import { deleteTemplate } from "../../db";
import { useTemplate } from "../../hooks/useTemplate";
import type { TemplateExercise } from "../../types";

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { template, loading, rename, addExercise, updateExercise, removeExercise } =
    useTemplate(id);
  const [renaming, setRenaming] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<TemplateExercise | null>(null);

  if (loading && !template) {
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.container}>
        <Text>Template not found</Text>
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

  return (
    <View style={styles.container}>
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

      <FlatList
        data={template.exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No exercises yet — add one below.</Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.exerciseRow} onPress={() => setEditingExercise(item)}>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{item.exerciseName}</Text>
              <Text style={styles.exerciseDefaults}>
                {item.defaultSets} sets × {item.defaultReps} reps @ {item.defaultWeight}kg
              </Text>
            </View>
            <Pressable
              style={styles.removeButton}
              onPress={() => handleRemoveExercise(item)}
              hitSlop={8}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </Pressable>
          </Pressable>
        )}
      />

      <Pressable style={styles.addButton} onPress={() => setAddingExercise(true)}>
        <Text style={styles.addButtonText}>+ Add Exercise</Text>
      </Pressable>

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
                exerciseName: editingExercise.exerciseName,
                defaultSets: editingExercise.defaultSets,
                defaultReps: editingExercise.defaultReps,
                defaultWeight: editingExercise.defaultWeight,
              }
            : undefined
        }
        onCancel={() => setEditingExercise(null)}
        onSubmit={handleEditExercise}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
  },
  templateName: { fontSize: 20, fontWeight: "700" },
  renameHint: { fontSize: 12, color: "#999", marginTop: 2 },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  deleteButtonText: { color: "#dc2626", fontWeight: "600", fontSize: 12 },
  list: { flexGrow: 1, paddingHorizontal: 16, gap: 10 },
  emptyText: { textAlign: "center", color: "#666", marginTop: 20 },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    padding: 14,
  },
  exerciseInfo: { gap: 4 },
  exerciseName: { fontSize: 16, fontWeight: "600" },
  exerciseDefaults: { fontSize: 13, color: "#666" },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeButtonText: { color: "#999", fontSize: 16 },
  addButton: {
    margin: 16,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  addButtonText: { color: "white", fontWeight: "600" },
});
