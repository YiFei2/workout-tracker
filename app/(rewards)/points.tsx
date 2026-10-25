import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { BalanceBanner } from "../../components/BalanceBanner";
import { ConfirmModal } from "../../components/ConfirmModal";
import { ManualPointsModal } from "../../components/ManualPointsModal";
import { useRewards } from "../../contexts/RewardsContext";
import { useTheme } from "../../contexts/ThemeContext";
import type { ThemeColors } from "../../lib/theme";
import type { PointsTransaction } from "../../types";

function describe(tx: PointsTransaction): string {
  switch (tx.type) {
    case "task":
      return tx.taskName ?? "Task completed";
    case "redemption":
      return tx.rewardName ?? "Reward redeemed";
    case "manual":
      return tx.note ?? "Manual adjustment";
    default:
      return "Adjustment";
  }
}

function typeLabel(tx: PointsTransaction): string {
  switch (tx.type) {
    case "task":
      return "Task";
    case "redemption":
      return "Redeemed";
    case "manual":
      return "Manual";
    default:
      return "";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date}, ${time}`;
}

export default function PointsHistoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { balance, transactions, loading, refresh, addManual, removeTransaction } = useRewards();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const [adjusting, setAdjusting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PointsTransaction | null>(null);

  const deleteMessage = (tx: PointsTransaction): string => {
    if (tx.amount > 0) {
      return `This will remove ${tx.amount} points from your balance.`;
    }
    return `This will add ${Math.abs(tx.amount)} points back to your balance.`;
  };

  return (
    <View style={styles.container}>
      <BalanceBanner balance={balance} />
      <Pressable style={styles.adjustRow} onPress={() => setAdjusting(true)}>
        <Text style={styles.adjustText}>+ Adjust points</Text>
      </Pressable>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              No points activity yet — complete a task to get started.
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const credit = item.amount >= 0;
          return (
            <View style={styles.row}>
              <View style={styles.body}>
                <Text style={styles.label}>{describe(item)}</Text>
                <Text style={styles.sub}>
                  {typeLabel(item)} · {formatDate(item.createdAt)}
                </Text>
              </View>
              <Text style={[styles.amount, { color: credit ? colors.success : colors.danger }]}>
                {credit ? "+" : "−"}
                {Math.abs(item.amount)}
              </Text>
              <Pressable style={styles.remove} onPress={() => setConfirmDelete(item)} hitSlop={8}>
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          );
        }}
      />

      <ManualPointsModal
        visible={adjusting}
        onCancel={() => setAdjusting(false)}
        onSubmit={(amount, note) => {
          setAdjusting(false);
          addManual(amount, note);
        }}
      />

      <ConfirmModal
        visible={confirmDelete !== null}
        title="Delete entry?"
        message={confirmDelete ? deleteMessage(confirmDelete) : undefined}
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return;
          const id = confirmDelete.id;
          setConfirmDelete(null);
          removeTransaction(id);
        }}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    adjustRow: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    adjustText: { color: colors.primary, fontWeight: "600", fontSize: 15 },
    list: { flexGrow: 1, paddingBottom: 24 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    body: { flex: 1, gap: 3 },
    label: { fontSize: 15, fontWeight: "600", color: colors.text },
    sub: { fontSize: 12, color: colors.textMuted },
    amount: { fontSize: 16, fontWeight: "800" },
    remove: { paddingHorizontal: 4 },
    removeText: { color: colors.textMuted, fontSize: 16 },
    emptyText: { textAlign: "center", color: colors.textMuted, marginTop: 40, paddingHorizontal: 24 },
  });
}
