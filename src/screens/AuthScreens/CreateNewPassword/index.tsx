import { Image, ImageBackground, StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import React, { useState } from 'react'
import { useSnackbarStore } from '../../../redux/hooks/useSnackbar';
import { useNavigation } from '@react-navigation/native';
import PrimaryButton from '../../../components/PrimaryButton';

const CreateNewPassword = () => {
    const { showSnackbar } = useSnackbarStore();
    const navigation = useNavigation();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Password validation checks
    const hasMinLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()]/.test(newPassword);

    // Calculate password strength
    const getPasswordStrength = () => {
        if (!newPassword) return 0;
        let strength = 0;
        if (hasMinLength) strength += 25;
        if (hasUppercase) strength += 25;
        if (hasNumber) strength += 25;
        if (hasSpecialChar) strength += 25;
        return strength;
    };

    const passwordStrength = getPasswordStrength();

    const getStrengthColor = () => {
        if (passwordStrength <= 25) return '#FF6B6B';
        if (passwordStrength <= 75) return '#FFA500';
        return '#4CAF50';
    };

    const handleResetPassword = () => {
        if (!newPassword || !confirmPassword) {
            showSnackbar('Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            showSnackbar('Passwords do not match');
            return;
        }

        if (!hasMinLength || !hasUppercase || !hasNumber || !hasSpecialChar) {
            showSnackbar('Please meet all password requirements');
            return;
        }

        showSnackbar('Password reset successfully');
        // Navigate to login or home screen
        // navigation.navigate('Login' as never);
        navigation.navigate('ResetSuccess' as never);
    };

    return (
        <View style={styles.container}>
            {/* Top image section */}
            <ImageBackground
                source={require('../../../assets/img/login.png')}
                style={styles.topImage}
                resizeMode="stretch"
            >
                <Image
                    source={require('../../../assets/img/VostroLogo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </ImageBackground>

            <View style={styles.card}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Image
                        source={require('../../../assets/img/createnewpass.png')} // You'll need a shield/lock icon
                        style={styles.lockImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Create New Password</Text>

                    <View style={styles.requirementsContainer}>
                        {/* New Password Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>New Password</Text>
                            <View style={styles.passwordInputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="············"
                                    secureTextEntry={!showNewPassword}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholderTextColor="#999"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Text style={styles.eyeText}>{showNewPassword ? '👁️' : '👁️‍🗨️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.passwordInputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="············"
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholderTextColor="#999"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Text style={styles.eyeText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Password Strength Indicator */}
                        {newPassword.length > 0 && (
                            <View style={styles.strengthContainer}>
                                <View style={styles.strengthBar}>
                                    <View
                                        style={[
                                            styles.strengthFill,
                                            {
                                                width: `${passwordStrength}%`,
                                                backgroundColor: getStrengthColor(),
                                            },
                                        ]}
                                    />
                                </View>
                                <View style={styles.strengthLabels}>
                                    <Text style={[styles.strengthLabel, passwordStrength <= 25 && styles.activeLabel]}>
                                        Weak
                                    </Text>
                                    <Text style={[styles.strengthLabel, passwordStrength > 25 && passwordStrength <= 75 && styles.activeLabel]}>
                                        Medium
                                    </Text>
                                    <Text style={[styles.strengthLabel, passwordStrength > 75 && styles.activeLabel]}>
                                        Strong
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>



                    {/* Password Requirements */}
                    {/* <View style={styles.requirementsContainer}> */}
                    <Text style={styles.requirementsTitle}>Password must contain:</Text>

                    <View style={styles.requirement}>
                        <Text style={[styles.checkmark, hasMinLength && styles.checkmarkActive]}>✓</Text>
                        <Text style={styles.requirementText}>Minimum 8 characters</Text>
                    </View>

                    <View style={styles.requirement}>
                        <Text style={[styles.checkmark, hasUppercase && styles.checkmarkActive]}>✓</Text>
                        <Text style={styles.requirementText}>At least one uppercase letter</Text>
                    </View>

                    <View style={styles.requirement}>
                        <Text style={[styles.checkmark, hasNumber && styles.checkmarkActive]}>✓</Text>
                        <Text style={styles.requirementText}>At least one number</Text>
                    </View>

                    <View style={styles.requirement}>
                        <Text style={[styles.checkmark, hasSpecialChar && styles.checkmarkActive]}>✓</Text>
                        <Text style={styles.requirementText}>At least one special character (!@#$%^&*)</Text>
                    </View>
                    {/* </View> */}

                    {/* Reset Password Button */}
                    <View style={styles.buttonContainer}>
                        <PrimaryButton
                            title="Reset Password"
                            onPress={handleResetPassword}
                        />
                    </View>
                    </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    topImage: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 180,
        height: 80,
    },
    card: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        marginTop: -40,
        borderTopRightRadius: 40,
        borderTopLeftRadius: 40,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    lockImage: {
        width: 80,
        height: 80,
        alignSelf: 'center',
        marginBottom: 15,
        marginTop: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 25,
        color: '#333',
    },
    inputContainer: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    passwordInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#7B7B7B1A',
        borderRadius: 8,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: '#333',
    },
    eyeIcon: {
        padding: 5,
    },
    eyeText: {
        fontSize: 18,
    },
    strengthContainer: {
        marginTop: 10,
        marginBottom: 20,
    },
    strengthBar: {
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    strengthFill: {
        height: '100%',
        borderRadius: 3,
        transition: 'width 0.3s ease',
    },
    strengthLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    strengthLabel: {
        fontSize: 12,
        color: '#999',
    },
    activeLabel: {
        fontWeight: '600',
        color: '#333',
    },
    requirementsContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingTop: 15,
        marginTop: 5,
    },
    requirementsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginVertical: 10,
    },
    requirement: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    checkmark: {
        fontSize: 16,
        color: '#E0E0E0',
        marginRight: 10,
        fontWeight: 'bold',
    },
    checkmarkActive: {
        color: '#E10600',
    },
    requirementText: {
        fontSize: 13,
        color: '#666',
    },
    buttonContainer: {
        marginTop: 25,
    },
});

export default CreateNewPassword;