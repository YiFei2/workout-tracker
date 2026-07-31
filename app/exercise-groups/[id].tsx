import { useMemo, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { NamePromptModal } from "../../components/NamePromptModal";
import { useTheme } from "../../contexts/ThemeContext";
import { deleteExerciseGroup } from "../../db";
import { useExerciseGroup } from "../../hooks/useExerciseGroup";
import type { ThemeColors } from "../../lib/theme";

export default function ExerciseGroupDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { group, loading, rename, addMember, removeMember } = useExerciseGroup(id);

  const [renaming, setRenaming] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  if (loading && !group) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Loading…</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Group not found</Text>
      </View>
    );
  }

  const handleDeleteGroup = () => {
    Alert.alert(
      "Delete group",
      `Delete "${group.name}"? Templates and sessions using it keep their current exercise name but lose the substitution link.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteExerciseGroup(group.id);
            router.back();
          },
        },
      ],
    );
  };

  const handleRemoveMember = (memberId: string, exerciseName: string) => {
    Alert.alert("Remove exercise", `Remove "${exerciseName}" from this group?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMember(memberId) },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Stack.Screen options={{ title: group.name }} />

        <View style={styles.header}>
          <Pressable onPress={() => setRenaming(true)}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.renameHint}>Tap to rename</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={handleDeleteGroup}>
            <Text style={styles.deleteButtonText}>Delete Group</Text>
          </Pressable>
        </View>

        {group.members.length === 0 ? (
          <Text style={styles.emptyText}>
            No exercises yet — add the interchangeable variants (e.g. Barbell Bench, Dumbbell
            Bench, Machine Chest Press) below.
          </Text>
        ) : (
          <View style={styles.memberList}>
            {group.members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <Text style={styles.memberName}>{member.exerciseName}</Text>
                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleRemoveMember(member.id, member.exerciseName)}
                  hitSlop={8}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Pressable style={styles.addButton} onPress={() => setAddingMember(true)}>
          <Text style={styles.addButtonText}>+ Add Exercise</Text>
        </Pressable>
      </ScrollView>

      <NamePromptModal
        visible={renaming}
        title="Rename Group"
        initialValue={group.name}
        submitLabel="Save"
        onCancel={() => setRenaming(false)}
        onSubmit={async (name) => {
          setRenaming(false);
          await rename(name);
        }}
      />

      <NamePromptModal
        visible={addingMember}
        title="Add Exercise"
        initialValue=""
        submitLabel="Add"
        onCancel={() => setAddingMember(false)}
        onSubmit={async (name) => {
          setAddingMember(false);
          await addMember(name);
        }}
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
    groupName: { fontSize: 20, fontWeight: "700", color: colors.text },
    renameHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    deleteButton: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: colors.dangerBg,
    },
    deleteButtonText: { color: colors.danger, fontWeight: "600", fontSize: 12 },
    emptyText: { textAlign: "center", color: colors.textMuted, marginTop: 20 },
    memberList: { gap: 8 },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceMuted,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    memberName: { fontSize: 15, fontWeight: "600", color: colors.text },
    removeButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    removeButtonText: { color: colors.textMuted, fontSize: 16 },
    addButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
    },
    addButtonText: { color: colors.primaryText, fontWeight: "600" },
  });
}
