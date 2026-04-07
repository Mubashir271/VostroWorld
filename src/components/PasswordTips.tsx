import { Image, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Error } from '../assets/icons'

const PasswordTips = () => {
    return (
        <View style={styles.tips}>
            <View style={styles.passwordRow}>
                <Image source={Error} style={styles.icon} />
                <Text style={styles.text}>Password Security Tips</Text>
            </View>
            <Text style={styles.tip}>✓ Use a unique password you don’t use elsewhere.</Text>
            <Text style={styles.tip}>✓ Never share your password with anyone.</Text>
            <Text style={styles.tip}>✓ We recommend using a password manager.</Text>
        </View>
    )
}

export default PasswordTips

const styles = StyleSheet.create({
    tips: {
        marginTop: 20,
        padding: 12,
        backgroundColor: '#FEEEED',
        borderWidth: 1,
        borderColor: '#FF7979',
        borderRadius: 8,
    },
    tip: { fontSize: 12, color: '#374151', marginBottom: 4 },
    passwordRow: { flexDirection: 'row', gap: 3, marginBottom: 6 },
    text: { color: '#1D1D1D', fontSize: 16, fontWeight: '500', },
    icon: {
        width: 24, height: 24, resizeMode: 'contain',
    },
})