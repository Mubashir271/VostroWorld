import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onPress: () => void;
}

const PRIMARY_COLOR = '#E10600';

const CheckboxItem: React.FC<CheckboxItemProps> = ({
  label,
  checked,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && (
          <Image
            source={require('../assets/icons/tick.png')} // ✅ your tick image
            style={styles.tick}
            resizeMode="contain"
          />
        )}
      </View>

      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#FFF',
  },
  checkboxChecked: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  tick: {
    width: 14,
    height: 14,
    tintColor: '#FFF', // makes tick white
  },
  label: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

export default CheckboxItem;
