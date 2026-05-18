// src/screens/AccessDenied/index.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CommonActions, useNavigation } from '@react-navigation/native';

const AccessDenied = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Icon */}
        <View style={styles.iconWrapper}>
          <Icon name="lock" size={64} color="#E63946" />
        </View>

        {/* Text */}
        <Text style={styles.title}>Access Denied</Text>
        <Text style={styles.subtitle}>
          You don't have permission to view this screen.{'\n'}
          Please contact your administrator.
        </Text>

        {/* Go Back Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={18} color="#fff" />
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>

        {/* Go to Dashboard */}
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Drawer' }],
            }),
          )}
        >
          <Text style={styles.outlineButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF0F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E63946',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  outlineButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E63946',
    width: '100%',
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#E63946',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AccessDenied;