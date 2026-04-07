// navigation/headerOptions.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { ImageSourcePropType } from 'react-native';

interface HeaderProps {
  navigation: any;
  title: string;
  leftIcon: ImageSourcePropType;
  rightIcon: ImageSourcePropType;
  onLeftPress?: () => void;
  onRightPress?: () => void;
}

export const getExtremeHeader = ({
  navigation,
  title,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
}: HeaderProps) => ({
  headerTitleAlign: 'center',

  headerTitle: () => (
    <Text
      style={{
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
      }}
    >
      {title}
    </Text>
  ),

  headerLeft: () => (
    <TouchableOpacity
      onPress={onLeftPress ?? (() => navigation.openDrawer())}
      style={{ marginLeft: 16 }}
    >
      <Image
        source={leftIcon}
        style={{ width: 24, height: 24, resizeMode: 'contain' }}
      />
    </TouchableOpacity>
  ),

  headerRight: () => (
    <TouchableOpacity
      onPress={onRightPress ?? (() => navigation.navigate('Notifications'))}
      style={{ marginRight: 16 }}
    >
      <Image
        source={rightIcon}
        style={{ width: 24, height: 24, resizeMode: 'contain' }}
      />
    </TouchableOpacity>
  ),
});
