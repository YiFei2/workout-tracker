import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import type { ThemeColors } from "../lib/theme";

interface Props {
  balance: number;
}

/** Points balance shown across all three Rewards surfaces. Negative = red. */
export function BalanceBanner({ balance }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const negative = balance < 0;

  return (
    <View style={styles.banner}>
      <Text style={styles.label}>Balance</Text>
      <Text style={[styles.value, negative && { color: colors.danger }]}>
        {balance} pts
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceMuted,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase" },
    value: { fontSize: 22, fontWeight: "800", color: colors.text },
  });
}
