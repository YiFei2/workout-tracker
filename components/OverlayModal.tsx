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
