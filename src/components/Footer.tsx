// src/components/Footer.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface FooterProps {
  text?: string;
  onPress?: () => void;
}

const Footer: React.FC<FooterProps> = ({ text, onPress }) => {
  if (!text) return null; // render nothing if no text provided

  const content = (
    <Text style={styles.backText}>{text}</Text>
  );

  return (
    <View style={styles.footer}>
      {/* Section break line */}
      <View style={styles.separator} />

      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    width: '90%',
    height: 1,
    backgroundColor: '#E0E0E0', // light gray line
    marginBottom: 20,
  },
  backText: {
    color: '#E10600',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Footer;
