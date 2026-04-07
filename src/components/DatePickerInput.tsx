import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, Error } from '../assets/icons';

interface Props {
    label: string; // e.g., 'Date of Birth' or 'Joining Date'
    value?: Date;
    onChange: (date: Date) => void;
    error?: string;
    maximumDate?: Date; // optional max date
    minimumDate?: Date; // optional min date
    placeholder?: string; // optional placeholder
}

export const DatePickerInput: React.FC<Props> = ({
    label,
    value,
    onChange,
    error,
    maximumDate,
    minimumDate,
    placeholder,
}) => {
    const [open, setOpen] = useState(false);

    const formattedDate =
        value instanceof Date
            ? value.toDateString()
            : placeholder || 'Select date';

    const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        // On Android, picker closes automatically
        setOpen(Platform.OS === 'ios'); 
        if (selectedDate) {
            onChange(selectedDate);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>

            <TouchableOpacity style={styles.input} onPress={() => setOpen(true)}>
                <Text style={[styles.text, !value && styles.placeholder]}>
                    {formattedDate}
                </Text>
                <Image source={Calendar} style={styles.icon} />
            </TouchableOpacity>

            {error && (
                <View style={styles.errorRow}>
                    <Image source={Error} style={styles.icon} />
                    <Text style={styles.error}>{error}</Text>
                </View>
            )}

            {open && (
                <DateTimePicker
                    value={value || new Date()}
                    mode="date"
                    display="spinner"
                    maximumDate={maximumDate}
                    minimumDate={minimumDate}
                    onChange={handleChange}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#00000029',
        borderRadius: 10,
        padding: 10,
        backgroundColor: '#fff',
    },
    label: {
        fontWeight: '600',
        marginBottom: 6,
    },
    input: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0000001A',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderColor: '#0000003D',
        borderWidth: 1,
    },
    text: {
        flex: 1,
        fontSize: 14,
    },
    placeholder: {
        color: '#9CA3AF',
    },
    icon: {
        width: 24,
        height: 24,
        marginRight: 6,
        resizeMode: 'contain',
    },
    errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    error: {
        color: 'red',
        fontSize: 10,
        marginLeft: 4,
    },
});
