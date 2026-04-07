import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Down, Error } from '../assets/icons/index';

export const SelectionField = ({ label, value, placeholder, onPress, error, icon: Icon }: any) => (
    <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
            <Text style={styles.label}>{label}</Text>
            {/* {error && <Text style={styles.infoIcon}>ⓘ</Text>} */}
            {error && <Image source={Error} style={styles.icon}/>}
        </View>
        <TouchableOpacity style={styles.inputBox} onPress={onPress}>
            <Text style={[styles.inputText, !value && { color: '#9CA3AF' }]}>
                {value || placeholder}
            </Text>
            <Image source={Down} style={styles.icon}/>
        </TouchableOpacity>
    </View>
);

const styles = StyleSheet.create({
    fieldContainer: { marginBottom: 16, borderWidth: 1, borderColor:'#00000029', backgroundColor:'#fff', borderRadius: 10, padding: 10 },
    labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent:'space-between' },
    label: { fontSize: 14, fontWeight: '600', color: '#374151' },
    infoIcon: { color: 'red', marginLeft: 4, fontSize: 12 },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0000001A',
        borderRadius: 8,
        padding: 14,
        borderWidth: 1,
        borderColor: '#0000003D'
    },
    inputText: { fontSize: 14, color: '#1F2937' },
    arrowIcon: { color: '#6B7280', fontSize: 18 },
    icon:{
        width: 24,
        height: 24,
        resizeMode:'contain',
    }
})