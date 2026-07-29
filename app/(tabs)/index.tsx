import { Text, View, StyleSheet } from 'react-native';

export default function TemplatesScreen() {
  return (
    <View style={styles.container}>
      <Text>Templates</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
