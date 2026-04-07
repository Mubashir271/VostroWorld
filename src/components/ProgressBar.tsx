import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ProgressBarProps {
  step: number;
  totalSteps: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ step, totalSteps }) => {
  const progress = (step / totalSteps) * 100;
  return (
    <View style={styles.container}>
      <View style={[styles.progress, { width: `${progress}%` }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    marginBottom: 16,
  },
  progress: {
    height: 4,
    backgroundColor: '#FF0000',
    borderRadius: 2,
  },
});
