// components/PasswordStrength.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Strength = 'None' | 'Weak' | 'Medium' | 'Strong';

interface Props {
  strength: Strength;
}

export const PasswordStrength: React.FC<Props> = ({ strength }) => {
 const progressMap: Record<Strength, string> = {
  None: '0%',
  Weak: '33%',
  Medium: '66%',
  Strong: '100%',
};

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.track}>
    
        <View
    style={[
      styles.fill,
      { width: progressMap[strength] },
    ]}
  />
      </View>

      {/* Labels */}
      <View style={styles.labels}>
        <Text style={[styles.label, strength === 'Weak' && styles.active]}>
          Weak
        </Text>
        <Text style={[styles.label, strength === 'Medium' && styles.active]}>
          Medium
        </Text>
        <Text style={[styles.label, strength === 'Strong' && styles.active]}>
          Strong
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#6DFF00', // bright green from screenshot
    borderRadius: 999,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
  },
  active: {
    color: '#6DFF00',
    fontWeight: '600',
  },
});
