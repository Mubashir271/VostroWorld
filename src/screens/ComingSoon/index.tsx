import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ComingSoon = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const title = route.name.replace(/([A-Z])/g, ' $1').trim();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Icon name="arrow-left" size={24} color="#333" />
      </TouchableOpacity>
      <Icon name="clock-outline" size={72} color="#E63946" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>This screen is coming soon</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  backBtn: { position: 'absolute', top: 50, left: 20, padding: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#333', marginTop: 20, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#999', textAlign: 'center' },
});

export default ComingSoon;
