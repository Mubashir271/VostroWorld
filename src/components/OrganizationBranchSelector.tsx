import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    FlatList,
    Image,
} from 'react-native';
import { Add, Down, Error } from '../assets/icons';

const DUMMY_BRANCHES = [
    'Gold Gym – DHA',
    'Gold Gym – Gulberg',
    'Fitness First – Johar Town',
    'Anytime Fitness – Model Town',
];

interface Props {
    value: string;
    onSelect: (branch: string) => void;
    error?: string;
    onAddNew?: () => void;
}

export const OrganizationBranchSelector: React.FC<Props> = ({
    value,
    onSelect,
    error,
    onAddNew,
}) => {
    const [visible, setVisible] = useState(false);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Organization/Branch Name *</Text>

            {/* Dropdown */}
            <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setVisible(true)}
                activeOpacity={0.7}
            >
                <Text style={[styles.value, !value && styles.placeholder]}>
                    {value || 'Select your gym branch'}
                </Text>
                {/* <Text style={styles.arrow}>⌄</Text> */}
                <Image source={Down} style={styles.icon}/>
            </TouchableOpacity>

            {/* Error + Add New */}
            <View style={styles.footerRow}>
                {error ? <View style={styles.errorRow}>
                    <Image source={Error} style={styles.icon} />
                    <Text style={styles.error}>{error}</Text>
                </View> : <View />}
                <TouchableOpacity onPress={onAddNew} style={styles.addNewRow}>
                    <Image source={Add} style={styles.icon} />

                    <Text style={styles.addNew}>Add new branch</Text>
                </TouchableOpacity>
            </View>

            {/* Modal */}
            <Modal transparent visible={visible} animationType="fade">
                <TouchableOpacity
                    style={styles.overlay}
                    onPress={() => setVisible(false)}
                >
                    <View style={styles.modal}>
                        <FlatList
                            data={DUMMY_BRANCHES}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.option}
                                    onPress={() => {
                                        onSelect(item);
                                        setVisible(false);
                                    }}
                                >
                                    <Text>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
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
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0000001A',
        borderWidth: 1,
        borderColor: '#0000003D',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    value: {
        flex: 1,
        fontSize: 14,
    },
    placeholder: {
        color: '#9CA3AF',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
        alignItems: 'center',
    },
    errorRow: { flexDirection: 'row', alignItems:'center', justifyContent:'center' },
    error: {
        color: 'red',
        fontSize: 10,
    },
    icon: {
        width: 24,
        height: 24,
        marginRight: 6,
        resizeMode: 'contain',
    },
    addNewRow:{flexDirection:'row', alignItems:'center', justifyContent:'center'},
    addNew: {
        fontSize: 12,
        color: '#374151',
    },
    overlay: {
        flex: 1,
        backgroundColor: '#00000055',
        justifyContent: 'center',
        padding: 24,
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
    },
    option: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: '#E5E7EB',
    },
});
