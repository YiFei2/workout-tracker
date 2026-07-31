import { useNavigation } from "@react-navigation/native";
import { useEffect, type ReactNode } from "react";
import { BackHandler, StyleSheet, View } from "react-native";

import { useTheme } from "../contexts/ThemeContext";

interface Props {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
}

/**
 * Full-screen overlay used instead of RN's <Modal> for dialogs that mix a
 * TextInput with a submit button. On Android, <Modal> is backed by a native
 * Dialog window; the first tap outside a focused TextInput is consumed by
 * the OS to dismiss the keyboard and never reaches the button underneath,
 * forcing a second tap. Rendering in-tree (same window) avoids that.
 */
export function OverlayModal({ visible, onRequestClose, children }: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation();

  useEffect(() => {
    if (!visible) {
      return;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onRequestClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onRequestClose]);

  // Expo Router's native-stack header (back button) and the iOS swipe-back
  // gesture are rendered by the navigator outside this component's own tree,
  // so the overlay's absolute-fill can't visually or physically block them.
  // Disable both while the dialog is open so a stray tap/swipe can't discard
  // in-progress dialog state, and restore them on close/unmount.
  // NOTE: assumes at most one OverlayModal is visible per screen at a time;
  // if two were ever visible simultaneously their effects could race and
  // stomp each other's restore call.
  useEffect(() => {
    if (!visible) {
      return;
    }
    navigation.setOptions({ headerBackVisible: false, gestureEnabled: false });
    return () => {
      navigation.setOptions({ headerBackVisible: true, gestureEnabled: true });
    };
  }, [visible, navigation]);

  if (!visible) {
    return null;
  }

  return <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>{children}</View>;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 24,
  },
});
