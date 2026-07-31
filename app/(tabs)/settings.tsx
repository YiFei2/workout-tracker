import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type ThemeMode } from "../../contexts/ThemeContext";
import { useWeightUnit } from "../../contexts/UnitContext";
import type { WeightUnit } from "../../lib/units";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const UNIT_OPTIONS: { value: WeightUnit; label: string }[] = [
  { value: "kg", label: "kg" },
  { value: "lb", label: "lb" },
];

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.segment, active && { backgroundColor: colors.primary }]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.segmentText, { color: active ? colors.primaryText : colors.text }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const { mode, colors, setMode } = useTheme();
  const { unit, setUnit } = useWeightUnit();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Appearance</Text>
      <SegmentedControl options={THEME_OPTIONS} value={mode} onChange={setMode} />

      <Text style={[styles.sectionTitle, styles.sectionSpacing, { color: colors.textMuted }]}>
        Weight Unit
      </Text>
      <SegmentedControl options={UNIT_OPTIONS} value={unit} onChange={setUnit} />

      <Text style={[styles.sectionTitle, styles.sectionSpacing, { color: colors.textMuted }]}>
        Data
      </Text>
      <Pressable
        style={[styles.navRow, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
        onPress={() => router.push("/locations")}
      >
        <Text style={[styles.navRowText, { color: colors.text }]}>Manage Locations</Text>
        <Text style={{ color: colors.textMuted }}>›</Text>
      </Pressable>
      <Pressable
        style={[styles.navRow, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
        onPress={() => router.push("/exercise-groups")}
      >
        <Text style={[styles.navRowText, { color: colors.text }]}>Manage Exercise Groups</Text>
        <Text style={{ color: colors.textMuted }}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase" },
  sectionSpacing: { marginTop: 16 },
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
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  navRowText: { fontSize: 15, fontWeight: "600" },
});
