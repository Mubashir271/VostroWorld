// src/components/PrimaryButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface PrimaryButtonProps {
    title: string;
    onPress: () => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
    disabled?: boolean;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({ title, onPress, style, textStyle, disabled = false }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.button, style, disabled && styles.disabled]}
            activeOpacity={0.8}
            disabled={disabled}
        >
            <Text style={[styles.buttonText, textStyle]}>{title}</Text>
        </TouchableOpacity>
    );
};

export default PrimaryButton;

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#E10600',
        width: '80%',
        alignSelf: 'center',
        borderRadius: 6,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
        textAlign: 'center',
    },
    disabled: {
        backgroundColor: '#E1060050', // lighter color when disabled
    },
});
