import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AppHeaderProps {
  title: string;
  leftIcon?: React.ReactNode;

  rightIcon?: React.ReactNode;      // First right icon (e.g. notification bell)
  dotIcon?: React.ReactNode;        // Second right icon (renamed as per your request)
  rightText?: string;               // Optional text on right

  onLeftPress?: () => void;
  onRightPress?: () => void;        // For rightIcon
  onDotPress?: () => void;          // For dotIcon
  onRightTextPress?: () => void;

  backgroundColor?: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  leftIcon,
  rightIcon,
  dotIcon,
  rightText,
  onLeftPress,
  onRightPress,
  onDotPress,
  onRightTextPress,
  backgroundColor = '#FFF8F8',
}) => {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <View style={styles.container}>
        
        {/* Left Side */}
        <View style={styles.sideContainer}>
          {leftIcon && (
            <TouchableOpacity onPress={onLeftPress} activeOpacity={0.7}>
              {leftIcon}
            </TouchableOpacity>
          )}
        </View>

        {/* Center Title */}
        <View style={styles.centerContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Right Side */}
        <View style={styles.rightContainer}>
          {rightIcon && (
            <TouchableOpacity 
              onPress={onRightPress} 
              activeOpacity={0.7}
              style={styles.rightItem}
            >
              {rightIcon}
            </TouchableOpacity>
          )}

          {dotIcon && (
            <TouchableOpacity 
              onPress={onDotPress} 
              activeOpacity={0.7}
              style={styles.rightItem}
            >
              {dotIcon}
            </TouchableOpacity>
          )}

          {rightText && (
            <TouchableOpacity 
              onPress={onRightTextPress} 
              activeOpacity={0.7}
              style={styles.rightItem}
            >
              <Text style={styles.rightText}>{rightText}</Text>
            </TouchableOpacity>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFF8F8',
  },
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sideContainer: {
    width: 40,
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // gap: 16,
  },
  rightItem: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  rightText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E63946',
  },
});