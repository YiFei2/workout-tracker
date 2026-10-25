import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { OverlayModal } from "./OverlayModal";
import { useTheme } from "../contexts/ThemeContext";
import type { ThemeColors } from "../lib/theme";

interface Props {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (amount: number, note: string | null) => void;
}

/**
 * Manual points adjustment. A credit adds, a correction subtracts — a
 * subtraction may drive the balance negative (manual debits are not guarded
 * against overdraw; only redemptions are).
 */
export function ManualPointsModal({ visible, onCancel, onSubmit }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [sign, setSign] = useState<1 | -1>(1);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) {
      setSign(1);
      setAmount("");
      setNote("");
    }
  }, [visible]);

  const parsedAmount = Math.floor(Number(amount));
  const valid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleSubmit = () => {
    if (!valid) {
      return;
    }
    const trimmedNote = note.trim();
    onSubmit(sign * parsedAmount, trimmedNote.length > 0 ? trimmedNote : null);
  };

  return (
    <OverlayModal visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Adjust points</Text>

          <View style={styles.segmented}>
            <Pressable
              style={[styles.segment, sign === 1 && { backgroundColor: colors.success }]}
              onPress={() => setSign(1)}
            >
              <Text style={[styles.segmentText, { color: sign === 1 ? colors.primaryText : colors.text }]}>
                Add
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segment, sign === -1 && { backgroundColor: colors.danger }]}
              onPress={() => setSign(-1)}
            >
              <Text style={[styles.segmentText, { color: sign === -1 ? colors.primaryText : colors.text }]}>
                Subtract
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g. 25"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            autoFocus
          />

          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. bonus for a good week"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.primary, !valid && styles.disabled]}
              onPress={handleSubmit}
              disabled={!valid}
            >
              <Text style={styles.primaryText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </OverlayModal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "center" },
    card: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, gap: 8 },
    title: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 4 },
    label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
    },
    segmented: {
      flexDirection: "row",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      padding: 4,
      gap: 4,
    },
    segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
    segmentText: { fontWeight: "600", fontSize: 14 },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 14 },
    button: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
    buttonText: { color: colors.text },
    primary: { backgroundColor: colors.primary },
    primaryText: { color: colors.primaryText, fontWeight: "600" },
    disabled: { opacity: 0.4 },
  });
}
