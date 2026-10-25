import { useEffect, useMemo, useRef, useState } from "react";
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

export interface RewardFormValues {
  name: string;
  cost: number;
}

interface Props {
  visible: boolean;
  title: string;
  initial?: RewardFormValues;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (values: RewardFormValues) => void;
}

export function RewardFormModal({
  visible,
  title,
  initial,
  submitLabel = "Save",
  onCancel,
  onSubmit,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState("");
  const [cost, setCost] = useState("");

  // Seed only on the closed→open transition — see TaskFormModal for why.
  const wasVisible = useRef(false);
  useEffect(() => {
    if (visible && !wasVisible.current) {
      setName(initial?.name ?? "");
      setCost(initial ? String(initial.cost) : "");
    }
    wasVisible.current = visible;
  }, [visible, initial]);

  const parsedCost = Math.floor(Number(cost));
  const valid = name.trim().length > 0 && Number.isFinite(parsedCost) && parsedCost > 0;

  const handleSubmit = () => {
    if (!valid) {
      return;
    }
    onSubmit({ name: name.trim(), cost: parsedCost });
  };

  return (
    <OverlayModal visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. 1 episode of a show"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <Text style={styles.label}>Cost (points)</Text>
          <TextInput
            style={styles.input}
            value={cost}
            onChangeText={setCost}
            placeholder="e.g. 50"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
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
              <Text style={styles.primaryText}>{submitLabel}</Text>
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
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 14 },
    button: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
    buttonText: { color: colors.text },
    primary: { backgroundColor: colors.primary },
    primaryText: { color: colors.primaryText, fontWeight: "600" },
    disabled: { opacity: 0.4 },
  });
}
