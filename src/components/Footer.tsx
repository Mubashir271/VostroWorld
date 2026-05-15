import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FooterProps {
  text?: string;
  onPress?: () => void;
}

const Footer: React.FC<FooterProps> = ({ text, onPress }) => {
  const insets = useSafeAreaInsets();

  if (!text) return null;

  const content = <Text style={styles.backText}>{text}</Text>;

  return (
    <View style={[styles.footer, { bottom: Math.max(insets.bottom, 16) }]}>
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
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    width: '90%',
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 12,
  },
  backText: {
    color: '#E10600',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Footer;