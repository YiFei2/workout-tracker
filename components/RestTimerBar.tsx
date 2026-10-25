import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../contexts/ThemeContext";
import type { RestTimerState } from "../hooks/useRestTimer";
import { formatMinutesSeconds } from "../lib/time";
import type { ThemeColors } from "../lib/theme";

interface Props {
  timer: RestTimerState | null;
  adjustStep: number;
  onAdjust: (deltaSeconds: number) => void;
  onDismiss: () => void;
}

// Sits above the screen content as a slim bar rather than a blocking modal,
// so the user can keep scrolling and logging other exercises while resting.
export function RestTimerBar({ timer, adjustStep, onAdjust, onDismiss }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);

  if (!timer) {
    return null;
  }

  return (
    <View style={styles.bar} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.info}>
          <Text style={styles.label} numberOfLines={1}>
            Resting — {timer.exerciseName}
          </Text>
          <Text style={styles.clock}>{formatMinutesSeconds(timer.secondsLeft)}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.adjustButton} onPress={() => onAdjust(-adjustStep)} hitSlop={8}>
            <Text style={styles.adjustButtonText}>-{adjustStep}s</Text>
          </Pressable>
          <Pressable style={styles.adjustButton} onPress={() => onAdjust(adjustStep)} hitSlop={8}>
            <Text style={styles.adjustButtonText}>+{adjustStep}s</Text>
          </Pressable>
          <Pressable style={styles.skipButton} onPress={onDismiss} hitSlop={8}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    bar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 12,
      paddingBottom: bottomInset + 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 6,
    },
    info: {
      flex: 1,
    },
    label: {
      fontSize: 12,
      color: colors.textMuted,
    },
    clock: {
      fontSize: 24,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      color: colors.text,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    adjustButton: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceMuted,
    },
    adjustButtonText: {
      fontWeight: "600",
      fontSize: 13,
      color: colors.text,
    },
    skipButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    skipButtonText: {
      color: colors.primaryText,
      fontWeight: "600",
      fontSize: 13,
    },
  });
}
