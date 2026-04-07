import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PASSWORD_RULES } from '../utils/password';
import CheckBox from './Checkbox';

export const PasswordRules = ({ password }: { password: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>Password must contain:</Text>
    {PASSWORD_RULES.map(rule => {
      const isValid = rule.test(password);
      return (
         <CheckBox
            key={rule.key}
            checked={isValid}
            onChange={() => {}} // visual-only
            label={rule.label}
            containerStyle={styles.row}
            boxStyle={styles.box}
            labelStyle={styles.label}
            borderColor={'#D1D5DB'}
            backgroundColor="#FFFFFF"
            checkColor="#E51728"
          />
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#00000029',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  title: {
    fontWeight: '600',
    marginBottom: 8,
  },
  row: {
    paddingVertical: 4,
    marginRight:8,
  },
  box: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
  },
  valid: {
    color: '#16A34A',
  },
});

