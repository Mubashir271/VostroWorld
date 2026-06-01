import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CommonActions, useNavigation } from '@react-navigation/native';

const AccessDenied = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        <View style={styles.iconWrapper}>
          <Icon name="shield-off-outline" size={60} color="#94a3b8" />
        </View>

        <Text style={styles.title}>Not Available</Text>
        <Text style={styles.subtitle}>
          This feature is not enabled for your account.{'\n'}
          Contact your administrator if you need access.
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={18} color="#fff" />
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() =>
            navigation.dispatch(
              CommonActions.reset({ index: 0, routes: [{ name: 'Drawer' }] }),
            )
          }
        >
          <Text style={styles.outlineButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#fff' },
  content:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrapper:       { width: 110, height: 110, borderRadius: 55, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title:             { fontSize: 24, fontWeight: '700', color: '#334155', marginBottom: 10 },
  subtitle:          { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  button:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E63946', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10, width: '100%', justifyContent: 'center', marginBottom: 12 },
  buttonText:        { color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 8 },
  outlineButton:     { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', width: '100%', alignItems: 'center' },
  outlineButtonText: { color: '#64748b', fontSize: 15, fontWeight: '600' },
});

export default AccessDenied;
