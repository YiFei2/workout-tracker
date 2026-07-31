import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { OverlayModal } from "./OverlayModal";
import { useTheme } from "../contexts/ThemeContext";
import type { ThemeColors } from "../lib/theme";

export interface PickerItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface Props {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selectedId?: string | null;
  emptyText?: string;
  onSelect: (id: string) => void;
  onCancel: () => void;
}

export function PickerModal({
  visible,
  title,
  items,
  selectedId = null,
  emptyText = "Nothing here yet.",
  onSelect,
  onCancel,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <OverlayModal visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          {items.length === 0 ? (
            <Text style={styles.emptyText}>{emptyText}</Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {items.map((item) => {
                const active = item.id === selectedId;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => onSelect(item.id)}
                  >
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>{item.label}</Text>
                      {item.sublabel ? <Text style={styles.rowSublabel}>{item.sublabel}</Text> : null}
                    </View>
                    {active ? <Text style={styles.checkmark}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
          </View>
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
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      gap: 12,
      maxHeight: "80%",
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
    },
    list: { flexGrow: 0 },
    listContent: { gap: 8 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceMuted,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    rowActive: { borderWidth: 1, borderColor: colors.primary },
    rowText: { flex: 1, gap: 2 },
    rowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
    rowSublabel: { fontSize: 12, color: colors.textMuted },
    checkmark: { color: colors.primary, fontSize: 16, fontWeight: "700", marginLeft: 8 },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    button: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    buttonText: {
      color: colors.text,
    },
  });
}
