import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { useTheme } from '../../contexts/ThemeContext';

export default function TabLayout() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        // The default Android ripple on a tab bar button spans almost the
        // whole tab segment. Shrink it to a radius just past the icon's own
        // footprint — react-navigation's internal button component isn't
        // part of its public API, so a plain Pressable spread with the same
        // props is the supported way to override just the ripple sizing.
        tabBarButton: ({ ref: _ref, ...props }) => (
          <Pressable {...props} android_ripple={{ ...props.android_ripple, radius: 28 }} />
        ),
        // The tab group is pushed onto the root stack with its header hidden,
        // so this header-left button is the on-screen way back to the module
        // picker (hardware back / swipe also work, but iOS has no hardware back).
        headerLeft: () => (
          <Pressable onPress={() => router.navigate('/')} hitSlop={12} style={{ paddingHorizontal: 16 }}>
            <Ionicons name="grid-outline" size={22} color={colors.text} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="templates"
        options={{
          title: 'Templates',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'barbell' : 'barbell-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
