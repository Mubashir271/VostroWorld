import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Image,
    Linking,
} from 'react-native';
import { Edit, Warning } from '../../../assets/icons';
import CheckBox from '../../../components/Checkbox';
import { Lock } from '../../../assets/icons/index';

const AccountConfirmation = () => {
    const [agreed, setAgreed] = useState({
        terms: true,
        privacy: true,
        code: true,
    });

    const InfoRow = ({ label, value }) => (
        <View style={styles.infoRow}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
            <TouchableOpacity>
                <Image source={Edit} style={styles.icon} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View>
            <Text style={styles.title}>Complete Your Registration</Text>
            <Text style={styles.subtitle}>Almost there! Final steps needed</Text>
            {/* Profile Card */}
            <View style={styles.card}>
                <InfoRow label="Name" value="Jhon Doe" />
                <InfoRow label="Email" value="jhon@example***.com" />
                <InfoRow label="Phone" value="+92 123456789" />
                <InfoRow label="Role" value="Trainer" />
                <InfoRow label="Branch" value="Main Branch" />
                <InfoRow label="Username" value="jhon.doe97" />

                <TouchableOpacity style={styles.editButton}>
                    <Text style={styles.editButtonText}>Edit Details</Text>
                </TouchableOpacity>
            </View>

            {/* Agreements Card */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Agreements</Text>

                {/* <AgreementRow linkText="Terms & Conditions" checked={agreed.terms} />
                <AgreementRow linkText="Privacy Policy" checked={agreed.privacy} />
                <AgreementRow linkText="Code of Conduct" checked={agreed.code} /> */}

                <CheckBox
                    checked={agreed.terms}
                    onChange={() => setAgreed({ ...agreed, terms: !agreed.terms })}
                    borderColor="#ffccd2"
                    backgroundColor="#fff5f5"
                    checkColor="#ff3b30"
                    containerStyle={styles.checkboxContainer}
                    label={
                        <Text style={{ fontSize: 14, color: '#444' }}>
                            I agree to the <Text style={{ color: '#ff3b30', fontWeight: '600' }} onPress={() => { console.log("Pressed") }}>Terms & Conditions</Text>
                        </Text>
                    }
                />
                <CheckBox
                    checked={agreed.privacy}
                    onChange={() => setAgreed({ ...agreed, privacy: !agreed.privacy })}
                    borderColor="#ffccd2"
                    backgroundColor="#fff5f5"
                    containerStyle={styles.checkboxContainer}
                    checkColor="#ff3b30"
                    label={
                        <Text style={{ fontSize: 14, color: '#444' }}>
                            I agree to the <Text style={{ color: '#ff3b30', fontWeight: '600' }}>Privacy Policy</Text>
                        </Text>
                    }
                />
                <CheckBox
                    checked={agreed.code}
                    onChange={() => setAgreed({ ...agreed, code: !agreed.code })}
                    borderColor="#ffccd2"
                    backgroundColor="#fff5f5"
                    containerStyle={styles.checkboxContainer}
                    checkColor="#ff3b30"
                    label={
                        <Text style={{ fontSize: 14, color: '#444' }}>
                            I agree to the <Text style={{ color: '#ff3b30', fontWeight: '600' }}>Code of Conduct</Text>
                        </Text>
                    }
                />

                {/* Admin Approval Notice */}
                <View style={styles.alertBox}>
                    <View style={styles.alertHeader}>
                        {/* <Icon name="alert" size={24} color="#d32f2f" /> */}
                        <Image source={Warning} style={styles.icon} />
                        <Text style={styles.alertTitle}>Admin Approval Required</Text>
                    </View>
                    <View >
                        <Text style={styles.bulletItem}>• Your account requires approval from your branch manager.</Text>
                        <Text style={styles.bulletItem}>• You'll be notified via email once approved.</Text>
                        <Text style={styles.bulletItem}>• This usually takes 24 - 48 hours.</Text>
                    </View>
                </View>

                {/* <View style={styles.errorRow}>
                    {/* <View style={styles.checkbox}><Icon name="check" size={16} color="#ff0000" /></View> 
                    <Text style={styles.errorText}>Please review and check all required boxes</Text>
                </View> */}
<View style={styles.errorRow}>
                <CheckBox
                    checked={true}
                    onChange={() =>{} }
                    borderColor="#ffccd2"
                    backgroundColor="#fff5f5"
                    checkColor="#ff3b30"
                    containerStyle={styles.checkboxContainer}
                    label={
                        <Text style={styles.errorText}>
                            Please review and check all required boxes
                        </Text>
                    }
                />
                </View>
                {/* 2FA Card */}
                <View style={styles.tfaBox}>
                    <View style={styles.tfaHeader}>
                        <Image source={Lock} style={styles.lockIcon} />
                        <View>
                            <Text style={styles.tfaTitle}>Enable Two-Factor Authentication</Text>
                            <Text style={styles.tfaSubtitle}>Adds extra security to your account.</Text>
                        </View>
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.primaryButton}>
                            <Text style={styles.primaryButtonText}>Enable Two-Factor Authentiction</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryButton}>
                            <Text style={styles.secondaryButtonText}>Skip for now</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#00000029',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#D1D1D1',
    },
    checkboxContainer: {
    marginRight: 6,
    paddingVertical: 4,
  },
    label: { flex: 1, color: '#1A1A1A', fontWeight: '600', fontSize: 14 },
    value: { flex: 2, color: '#1A1A1A', fontSize: 14 },
    icon: {
        width: 24,
        height: 24,
        resizeMode: 'contain'
    },
    agreementLabel: { fontSize: 15, color: '#555' },
    editButton: {
        marginTop: 15,
        backgroundColor: '#f8f8f8',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        alignItems: 'center',
    },
    editButtonText: { color: '#ff0000', fontWeight: '700' },
    sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: '#000' },
    agreementRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    checkbox: {
        width: 22,
        height: 22,
        borderWidth: 1,
        borderColor: '#ff0000',
        borderRadius: 4,
        backgroundColor: '#fff5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    agreementText: { fontSize: 14, color: '#666' },
    linkText: { color: '#ff4d4d', textDecorationLine: 'none', fontWeight: '500' },
    alertBox: {
        backgroundColor: '#FEEEED',
        borderRadius: 10,
        padding: 15,
        borderWidth: 1,
        borderColor: '#FF7979',
        marginTop: 15,
    },
    alertHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    alertTitle: { marginLeft: 10, fontWeight: 'bold', fontSize: 16, color: '#333' },
    bulletItem: { fontSize: 11, color: '#777', marginBottom: 3, paddingLeft: 10 },
    errorRow: { marginTop: 20 },
    errorText: { fontSize: 13, color: '#E10600', fontWeight: '500' },
    tfaBox: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#FEEEED',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FF7979',
    },
    tfaHeader: { flexDirection: 'row', marginBottom: 15 },
    lockIcon: { width: 34, height: 34, resizeMode:'contain', marginRight: 15 },
    tfaTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    tfaSubtitle: { fontSize: 13, color: '#777' },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
    primaryButton: {
        backgroundColor: '#e60000',
        padding: 10,
        borderRadius: 6,
        flex: 1,
        marginRight: 8,
        justifyContent: 'center',
    },
    primaryButtonText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
    secondaryButton: {
        backgroundColor: '#f2f2f2',
        padding: 10,
        borderRadius: 6,
        flex: 0.5,
        borderWidth: 1,
        borderColor: '#ddd',
        justifyContent: 'center',
    },
    secondaryButtonText: { color: '#777', fontSize: 11, textAlign: 'center' },
});

export default AccountConfirmation;