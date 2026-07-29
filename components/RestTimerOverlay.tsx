import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import type { RestTimerState } from "../hooks/useRestTimer";

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
  if (!timer) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 16,
    minWidth: 240,
  },
  label: {
    fontSize: 14,
    color: "#666",
  },
  clock: {
    fontSize: 48,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  adjustRow: {
    flexDirection: "row",
    gap: 12,
  },
  adjustButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
  },
  adjustButtonText: {
    fontWeight: "600",
  },
  skipButton: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "#2563eb",
  },
  skipButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
