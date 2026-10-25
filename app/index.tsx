import { useMemo } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRewards } from "../contexts/RewardsContext";
import { useTheme } from "../contexts/ThemeContext";
import type { ThemeColors } from "../lib/theme";

interface ModuleCard {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { balance } = useRewards();

  const modules: ModuleCard[] = [
    {
      key: "workout",
      title: "Workout Tracker",
      subtitle: "Log gym sessions & templates",
      icon: "barbell",
      route: "/templates",
    },
    {
      key: "rewards",
      title: "Rewards",
      subtitle: `Tasks & store · ${balance} pts`,
      icon: "gift",
      route: "/tasks",
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.heading}>Modules</Text>
      <View style={styles.grid}>
        {modules.map((m) => (
          <Pressable
            key={m.key}
            style={styles.card}
            onPress={() => router.navigate(m.route)}
            android_ripple={{ color: colors.neutralBg }}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={m.icon} size={30} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{m.title}</Text>
            <Text style={styles.cardSubtitle}>{m.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
    heading: { fontSize: 28, fontWeight: "800", color: colors.text, marginBottom: 20 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
    card: {
      width: "100%",
      backgroundColor: colors.surfaceMuted,
      borderRadius: 16,
      padding: 20,
      gap: 8,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    cardTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
    cardSubtitle: { fontSize: 14, color: colors.textMuted },
  });
}
