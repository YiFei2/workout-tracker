import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { BalanceBanner } from "../../components/BalanceBanner";
import { ConfirmModal } from "../../components/ConfirmModal";
import { RewardFormModal, type RewardFormValues } from "../../components/RewardFormModal";
import { useRewards } from "../../contexts/RewardsContext";
import { useTheme } from "../../contexts/ThemeContext";
import type { ThemeColors } from "../../lib/theme";
import type { Reward } from "../../types";

export default function StoreScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { balance, rewards, loading, refresh, addReward, editReward, removeReward, redeem } =
    useRewards();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [confirmRedeem, setConfirmRedeem] = useState<Reward | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Reward | null>(null);

  return (
    <View style={styles.container}>
      <FlatList
        data={rewards}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<BalanceBanner balance={balance} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              No rewards yet — add something to spend your points on.
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const affordable = balance >= item.cost;
          return (
            <View style={styles.card}>
              <Pressable style={styles.body} onPress={() => setEditing(item)}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.cost}>{item.cost} pts</Text>
              </Pressable>
              <Pressable
                style={[styles.redeem, !affordable && styles.redeemDisabled]}
                onPress={() => setConfirmRedeem(item)}
                disabled={!affordable}
              >
                <Text style={[styles.redeemText, !affordable && styles.redeemTextDisabled]}>
                  {affordable ? "Redeem" : "Not enough"}
                </Text>
              </Pressable>
              <Pressable style={styles.remove} onPress={() => setConfirmDelete(item)} hitSlop={8}>
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => setCreating(true)}>
        <Text style={styles.fabText}>+ New Reward</Text>
      </Pressable>

      <RewardFormModal
        visible={creating}
        title="New Reward"
        submitLabel="Create"
        onCancel={() => setCreating(false)}
        onSubmit={(values: RewardFormValues) => {
          setCreating(false);
          addReward(values.name, values.cost);
        }}
      />

      <RewardFormModal
        visible={editing !== null}
        title="Edit Reward"
        submitLabel="Save"
        initial={editing ? { name: editing.name, cost: editing.cost } : undefined}
        onCancel={() => setEditing(null)}
        onSubmit={(values: RewardFormValues) => {
          if (!editing) return;
          const id = editing.id;
          setEditing(null);
          editReward(id, values);
        }}
      />

      <ConfirmModal
        visible={confirmRedeem !== null}
        title="Redeem reward?"
        message={
          confirmRedeem
            ? `Redeem "${confirmRedeem.name}" for ${confirmRedeem.cost} points?`
            : undefined
        }
        confirmLabel="Redeem"
        onCancel={() => setConfirmRedeem(null)}
        onConfirm={() => {
          if (!confirmRedeem) return;
          const id = confirmRedeem.id;
          setConfirmRedeem(null);
          // Guarded by the disabled button, but redeem() also rejects an
          // overdraw at the data layer; swallow since the UI prevents it.
          redeem(id).catch(() => undefined);
        }}
      />

      <ConfirmModal
        visible={confirmDelete !== null}
        title="Delete reward?"
        message={
          confirmDelete
            ? `Delete "${confirmDelete.name}"? Past redemptions stay in your points history.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return;
          const id = confirmDelete.id;
          setConfirmDelete(null);
          removeReward(id);
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
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 10,
      padding: 14,
      marginHorizontal: 16,
      marginTop: 10,
    },
    body: { flex: 1, gap: 4 },
    name: { fontSize: 16, fontWeight: "600", color: colors.text },
    cost: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
    redeem: {
      backgroundColor: colors.primary,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    redeemDisabled: { backgroundColor: colors.neutralBg },
    redeemText: { color: colors.primaryText, fontWeight: "700", fontSize: 13 },
    redeemTextDisabled: { color: colors.textMuted },
    remove: { paddingHorizontal: 4 },
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
