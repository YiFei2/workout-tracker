import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { useTheme } from '../../contexts/ThemeContext';

export default function RewardsTabLayout() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarButton: ({ ref: _ref, ...props }) => (
          <Pressable {...props} android_ripple={{ ...props.android_ripple, radius: 28 }} />
        ),
        headerLeft: () => (
          <Pressable onPress={() => router.navigate('/')} hitSlop={12} style={{ paddingHorizontal: 16 }}>
            <Ionicons name="grid-outline" size={22} color={colors.text} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Store',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'gift' : 'gift-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="points"
        options={{
          title: 'Points',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
