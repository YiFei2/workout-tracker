import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type ThemeMode } from "../../contexts/ThemeContext";

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
  { mode: "system", label: "System" },
];

export default function SettingsScreen() {
  const { mode, colors, setMode } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Appearance</Text>

      <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        {OPTIONS.map((option) => {
          const active = option.mode === mode;
          return (
            <Pressable
              key={option.mode}
              style={[styles.segment, active && { backgroundColor: colors.primary }]}
              onPress={() => setMode(option.mode)}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? colors.primaryText : colors.text },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase" },
  segmented: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentText: { fontWeight: "600", fontSize: 14 },
});
