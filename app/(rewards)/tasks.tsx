import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { BalanceBanner } from "../../components/BalanceBanner";
import { ConfirmModal } from "../../components/ConfirmModal";
import { TaskFormModal, type TaskFormValues } from "../../components/TaskFormModal";
import { useRewards } from "../../contexts/RewardsContext";
import { useTheme } from "../../contexts/ThemeContext";
import type { ThemeColors } from "../../lib/theme";
import type { Task } from "../../types";

export default function TasksScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const {
    balance,
    tasks,
    loading,
    refresh,
    addTask,
    editTask,
    removeTask,
    markTaskComplete,
    undoTaskCompletion,
  } = useRewards();

  // Workouts can credit points from outside this module (auto-completing a
  // linked task), so re-sync whenever this tab regains focus.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [confirmUndo, setConfirmUndo] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);

  const handleComplete = (task: Task) => {
    if (task.done) {
      // A done one-off: tapping it again asks to undo (with clawback confirm).
      setConfirmUndo(task);
      return;
    }
    markTaskComplete(task.id);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<BalanceBanner balance={balance} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              No tasks yet — add one to start earning points.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.done && styles.cardDone]}>
            <Pressable
              style={[styles.checkbox, item.done && styles.checkboxDone]}
              onPress={() => handleComplete(item)}
              hitSlop={8}
            >
              <Ionicons
                name={item.done ? "checkmark" : item.kind === "repeatable" ? "add" : "ellipse-outline"}
                size={item.kind === "repeatable" && !item.done ? 22 : 20}
                color={item.done ? colors.primaryText : colors.primary}
              />
            </Pressable>

            <Pressable style={styles.body} onPress={() => setEditing(item)}>
              <Text style={[styles.name, item.done && styles.nameDone]}>{item.name}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.points}>+{item.points} pts</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.meta}>
                  {item.kind === "repeatable" ? "Repeatable" : "One-off"}
                </Text>
                {item.linkType === "workout" && (
                  <>
                    <Text style={styles.metaDot}>·</Text>
                    <Ionicons name="barbell-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.meta}>Workout</Text>
                  </>
                )}
                {item.completionCount > 0 && (
                  <>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.meta}>done ×{item.completionCount}</Text>
                  </>
                )}
              </View>
              <View style={styles.actionRow}>
                {item.linkType === "workout" && (
                  <Pressable
                    style={styles.chip}
                    onPress={() => router.navigate("/templates")}
                    hitSlop={6}
                  >
                    <Ionicons name="play" size={12} color={colors.primary} />
                    <Text style={styles.chipText}>Start</Text>
                  </Pressable>
                )}
                {item.kind === "repeatable" && item.completionCount > 0 && (
                  <Pressable style={styles.chip} onPress={() => setConfirmUndo(item)} hitSlop={6}>
                    <Ionicons name="arrow-undo" size={12} color={colors.primary} />
                    <Text style={styles.chipText}>Undo last</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>

            <Pressable style={styles.remove} onPress={() => setConfirmDelete(item)} hitSlop={8}>
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </View>
        )}
      />

      <Pressable style={styles.fab} onPress={() => setCreating(true)}>
        <Text style={styles.fabText}>+ New Task</Text>
      </Pressable>

      <TaskFormModal
        visible={creating}
        title="New Task"
        submitLabel="Create"
        onCancel={() => setCreating(false)}
        onSubmit={(values: TaskFormValues) => {
          setCreating(false);
          addTask(values);
        }}
      />

      <TaskFormModal
        visible={editing !== null}
        title="Edit Task"
        submitLabel="Save"
        initial={
          editing
            ? {
                name: editing.name,
                points: editing.points,
                kind: editing.kind,
                linkType: editing.linkType,
              }
            : undefined
        }
        onCancel={() => setEditing(null)}
        onSubmit={(values: TaskFormValues) => {
          if (!editing) return;
          const id = editing.id;
          setEditing(null);
          editTask(id, values);
        }}
      />

      <ConfirmModal
        visible={confirmUndo !== null}
        title="Undo completion?"
        message={
          confirmUndo
            ? `Undo "${confirmUndo.name}"? ${confirmUndo.points} points will be removed from your balance.`
            : undefined
        }
        confirmLabel="Undo"
        destructive
        onCancel={() => setConfirmUndo(null)}
        onConfirm={() => {
          if (!confirmUndo) return;
          const id = confirmUndo.id;
          setConfirmUndo(null);
          undoTaskCompletion(id);
        }}
      />

      <ConfirmModal
        visible={confirmDelete !== null}
        title="Delete task?"
        message={
          confirmDelete
            ? `Delete "${confirmDelete.name}"? Past completions stay in your points history.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return;
          const id = confirmDelete.id;
          setConfirmDelete(null);
          removeTask(id);
        }}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { flexGrow: 1, paddingBottom: 90 },
    card: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 10,
      padding: 14,
      marginHorizontal: 16,
      marginTop: 10,
    },
    cardDone: { opacity: 0.6 },
    checkbox: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    checkboxDone: { backgroundColor: colors.primary, borderColor: colors.primary },
    body: { flex: 1, gap: 4 },
    name: { fontSize: 16, fontWeight: "600", color: colors.text },
    nameDone: { textDecorationLine: "line-through", color: colors.textMuted },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
    points: { fontSize: 13, fontWeight: "700", color: colors.success },
    meta: { fontSize: 13, color: colors.textMuted },
    metaDot: { fontSize: 13, color: colors.textMuted },
    actionRow: { flexDirection: "row", gap: 8, marginTop: 6 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.neutralBg,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    chipText: { fontSize: 12, fontWeight: "600", color: colors.primary },
    remove: { paddingHorizontal: 4, paddingVertical: 2 },
    removeText: { color: colors.textMuted, fontSize: 16 },
    emptyText: { textAlign: "center", color: colors.textMuted, marginTop: 40, paddingHorizontal: 24 },
    fab: {
      position: "absolute",
      right: 16,
      bottom: 24,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 24,
    },
    fabText: { color: colors.primaryText, fontWeight: "600" },
  });
}
