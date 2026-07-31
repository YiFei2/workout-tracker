import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import { OverlayModal } from "./OverlayModal";
import type { RestTimerState } from "../hooks/useRestTimer";
import type { ThemeColors } from "../lib/theme";

interface Props {
  timer: RestTimerState | null;
  adjustStep: number;
  onAdjust: (deltaSeconds: number) => void;
  onDismiss: () => void;
}

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function RestTimerOverlay({ timer, adjustStep, onAdjust, onDismiss }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!timer) {
    return null;
  }

  return (
    <OverlayModal visible={!!timer} onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.label}>Resting — {timer.exerciseName}</Text>
          <Text style={styles.clock}>{formatSeconds(timer.secondsLeft)}</Text>

          <View style={styles.adjustRow}>
            <Pressable style={styles.adjustButton} onPress={() => onAdjust(-adjustStep)}>
              <Text style={styles.adjustButtonText}>-{adjustStep}s</Text>
            </Pressable>
            <Pressable style={styles.adjustButton} onPress={() => onAdjust(adjustStep)}>
              <Text style={styles.adjustButtonText}>+{adjustStep}s</Text>
            </Pressable>
          </View>

          <Pressable style={styles.skipButton} onPress={onDismiss}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </OverlayModal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 28,
      alignItems: "center",
      gap: 16,
      minWidth: 240,
    },
    label: {
      fontSize: 14,
      color: colors.textMuted,
    },
    clock: {
      fontSize: 48,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      color: colors.text,
    },
    adjustRow: {
      flexDirection: "row",
      gap: 12,
    },
    adjustButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.surfaceMuted,
    },
    adjustButtonText: {
      fontWeight: "600",
      color: colors.text,
    },
    skipButton: {
      marginTop: 4,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    skipButtonText: {
      color: colors.primaryText,
      fontWeight: "600",
    },
  });
}
