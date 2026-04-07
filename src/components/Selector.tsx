import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import CheckBox from './Checkbox';

interface SelectorProps {
  label: string;
  selected: string;
  onSelect: (gender: string) => void;
  options: any;
  icon?: ImageSourcePropType;
}

export const Selector: React.FC<SelectorProps> = ({
  label,
  selected,
  onSelect,
  options,
  icon,
}) => {
  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        {icon && <Image source={icon} style={styles.icon} />}
        <Text style={styles.label}>{label}</Text>
      </View>

      {/* Options */}
      <View style={styles.optionsRow}>
        {options.map(option => (
          <CheckBox
            key={option}
            checked={selected === option}
            onChange={() => onSelect(option)}
            label={option}
            containerStyle={styles.checkboxContainer}
            boxStyle={styles.checkbox}
            labelStyle={styles.checkboxLabel}
            borderColor="#D1D5DB"
            backgroundColor={
              selected === option ? '#E5E7EB' : '#E5E7EB'
            }
            checkColor="#111827"
          />
        ))}
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00000029',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  icon: {
    width: 24,
    height: 24,
    marginRight: 6,
    resizeMode: 'contain',
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
  },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  checkboxContainer: {
    marginRight: 6,
    paddingVertical: 4,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },

  checkboxLabel: {
    fontSize: 13,
    color: '#111827',
  },
});
