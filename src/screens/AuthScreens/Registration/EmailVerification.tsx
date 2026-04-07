import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'

import PasswordTips from '../../../components/PasswordTips'
import { Time } from '../../../assets/icons';

const EmailVerification = () => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [codeExpiry, setCodeExpiry] = useState(18); // 00:18
    const [resendTime, setResendTime] = useState(30); // 00:30
    const inputRefs = useRef<(TextInput | null)[]>([]);

    // Countdown timer for code expiry
    useEffect(() => {
        if (codeExpiry > 0) {
            const timer = setTimeout(() => setCodeExpiry(codeExpiry - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [codeExpiry]);

    // Countdown timer for resend code
    useEffect(() => {
        if (resendTime > 0) {
            const timer = setTimeout(() => setResendTime(resendTime - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendTime]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const handleCodeChange = (text: string, index: number) => {
        // Only allow numbers
        if (text && !/^\d+$/.test(text)) return;

        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        // Auto-focus next input
        if (text && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        // Handle backspace
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleResendCode = () => {
        if (resendTime === 0) {
            // Reset timers and code
            setResendTime(30);
            setCodeExpiry(18);
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };
    return (
        <View>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>We've sent a verification code to your email</Text>

            <View style={styles.container}>

                <Text style={styles.email}>user@exampl***.com</Text>

                {/* Instruction */}
                <Text style={styles.instruction}>
                    Please enter the 6-digit code sent to your email.
                </Text>

                {/* Code Input */}
                <View style={styles.codeContainer}>
                    {code.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => (inputRefs.current[index] = ref)}
                            value={digit}
                            onChangeText={(text) => handleCodeChange(text, index)}
                            style={[
                                styles.codeInput,
                                digit ? styles.codeInputFilled : null,
                                index === 0 && !digit ? styles.codeInputActive : null,
                            ]}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="number-pad"
                            secureTextEntry={true}
                            textContentType='oneTimeCode'
                            returnKeyType='done'
                            maxLength={1}
                            autoFocus={index === 0}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                {/* Code Expiry Timer */}
                <View style={styles.timerContainer}>
                    {/* <View style={styles.timerIcon} /> */}
                    <Image source={Time} style={styles.timerIcon} />
                    <Text style={styles.timerText}>
                        Code expires in{' '}
                        <Text style={styles.timerValue}>{formatTime(codeExpiry)}</Text>
                    </Text>
                </View>

                {/* Resend Code */}
                <View style={styles.resendSection}>
                    <Text style={styles.resendQuestion}>Didn't receive the code?</Text>
                    <TouchableOpacity onPress={handleResendCode} disabled={resendTime > 0}>
                        <Text
                            style={[
                                styles.resendText,
                                resendTime === 0 && styles.resendTextActive,
                            ]}
                        >
                            Resend code in{' '}
                            <Text style={styles.resendTimer}>{formatTime(resendTime)}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>


            </View>
            {/* Try Different Email */}
            <TouchableOpacity style={styles.differentEmailButton}>
                <Text style={styles.differentEmailText}>Try a different email</Text>
            </TouchableOpacity>
            <PasswordTips />
        </View>
    )
}

export default EmailVerification

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#00000029',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
    },
    title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
    email: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 12,
    },
    instruction: {
        fontSize: 14,
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 24,
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
        marginBottom: 16,
    },
    codeInput: {
        width: 48,
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    codeInputActive: {
        borderColor: '#FF4D4D',
        borderWidth: 2,
    },
    codeInputFilled: {
        borderColor: '#4CAF50',
    },
    timerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        gap: 6,
    },
    timerIcon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    timerText: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    timerValue: {
        color: '#E51728',
        fontWeight: '500',
    },
    resendSection: {
        alignItems: 'center',
        marginBottom: 16,
    },
    resendQuestion: {
        fontSize: 14,
        color: '#1A1A1A',
        marginBottom: 24,
    },
    resendText: {
        fontSize: 14,
        color: '#999999',
    },
    resendTextActive: {
        color: '#FF4D4D',
        fontWeight: '500',
    },
    resendTimer: {
        color: '#FF4D4D',
    },
    differentEmailButton: {
        paddingTop: 24,
        alignItems: 'center',
        // marginBottom: 32,
    },
    differentEmailText: {
        fontSize: 14,
        color: '#FF4D4D',
        fontWeight: '500',
    },
})