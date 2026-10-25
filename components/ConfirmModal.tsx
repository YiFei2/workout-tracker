import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { OverlayModal } from "./OverlayModal";
import { useTheme } from "../contexts/ThemeContext";
import type { ThemeColors } from "../lib/theme";

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (red). */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Themed confirmation dialog — used for the Rewards module's clawback, redeem,
 * and delete confirmations instead of the native Alert, which renders in the
 * OS light style and clashes with the app's dark theme (see backlog).
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <OverlayModal visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={onCancel}>
              <Text style={styles.buttonText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, destructive ? styles.destructive : styles.primary]}
              onPress={onConfirm}
            >
              <Text style={destructive ? styles.destructiveText : styles.primaryText}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </OverlayModal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "center" },
    card: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, gap: 12 },
    title: { fontSize: 18, fontWeight: "600", color: colors.text },
    message: { fontSize: 15, color: colors.textMuted, lineHeight: 21 },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 4 },
    button: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
    buttonText: { color: colors.text },
    primary: { backgroundColor: colors.primary },
    primaryText: { color: colors.primaryText, fontWeight: "600" },
    destructive: { backgroundColor: colors.danger },
    destructiveText: { color: colors.primaryText, fontWeight: "600" },
  });
}
