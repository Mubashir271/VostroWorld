import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, ImageSourcePropType } from 'react-native';

interface SocialButtonProps {
  label: string;
  icon?: ImageSourcePropType; // optional icon
  onPress?: () => void;
}

export const SocialButton: React.FC<SocialButtonProps> = ({ label, icon, onPress }) => (
  <TouchableOpacity style={styles.socialButton} onPress={onPress} activeOpacity={0.8}>
    {icon && (
      <Image source={icon} style={styles.icon} resizeMode="contain" />
    )}
    <Text style={styles.socialText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  socialButton: {
    flexDirection: 'row', // row layout for icon + text
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#00000029',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  socialText: {
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 8, // space between icon and text
    color: '#6B7280'
  },
  icon: {
    width: 24,
    height: 24,
  },
});
