import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Dimensions,
    Image,
    NativeSyntheticEvent,
    TextInputKeyPressEventData,
} from 'react-native';
import PrimaryButton from './PrimaryButton';

interface VerificationCodeInputProps {
    phoneOrEmail: string;
    onVerify: () => void;
    onUseBackup?: () => void;
    onBackToLogin?: () => void;
    resendDelaySeconds?: number;
    codeExpireSeconds?: number;
}

const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
    phoneOrEmail,
    onVerify,
    onUseBackup,
    onBackToLogin,
    resendDelaySeconds = 30,
    codeExpireSeconds = 20,
}) => {
    const [resendTimer, setResendTimer] = useState(resendDelaySeconds);
    const [expireTimer, setExpireTimer] = useState(codeExpireSeconds);
    const [code, setCode] = useState<string[]>(Array(6).fill(''));

    const inputsRef = useRef<(TextInput | null)[]>([]);

    // Combined timer effect
    useEffect(() => {
        const interval = setInterval(() => {
            setResendTimer((t) => (t > 0 ? t - 1 : 0));
            setExpireTimer((t) => (t > 0 ? t - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleChangeText = (text: string, index: number) => {
        if (text.length > 1) {
            text = text.slice(-1);
        }
        if (!/^\d?$/.test(text)) return;

        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        if (text && index < inputsRef.current.length - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const renderInputBoxes = () =>
        code.map((digit, i) => (
            <TextInput
                key={i}
                ref={(ref) => (inputsRef.current[i] = ref)}
                value={digit}
                onChangeText={(text) => handleChangeText(text, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                style={styles.inputBox}
                secureTextEntry={true}
                textContentType="oneTimeCode"
                returnKeyType="done"
                autoFocus={i === 0}
            />
        ));

    const maskedPhoneOrEmail = phoneOrEmail;

    return (
        <View style={styles.container}>
            <Text style={styles.infoText}>We've sent a 6-digit code to</Text>
            <Text style={styles.phoneEmailText}>{maskedPhoneOrEmail}</Text>

            <Text style={styles.resendText}>
                Resend code in{' '}
                <Text style={styles.resendTimerText}>{resendTimer} seconds.</Text>
            </Text>

            <View style={styles.inputRow}>{renderInputBoxes()}</View>

            <View style={{ flexDirection: 'row', gap: 4 }}>
                <Image source={require('../assets/icons/time.png')} style={{ height: 20, width: 20 }} />
                <Text style={styles.expireText}>
                    Code expires in{' '}
                    <Text style={styles.expireTimerText}>
                        00:{expireTimer < 10 ? '0' : ''}
                        {expireTimer}
                    </Text>
                </Text>
            </View>

            <PrimaryButton
                title="Verify and Continue"
                onPress={onVerify}
            />

            {onUseBackup && (
                <TouchableOpacity onPress={onUseBackup}>
                    <Text style={styles.backupCodeText}>Use a backup code</Text>
                </TouchableOpacity>
            )}

            <Text style={styles.lostAppText}>Lost your authenticator App?</Text>

            {onBackToLogin && (
                <>
                    <View style={styles.separator} />

                    <TouchableOpacity onPress={onBackToLogin}>
                        <Text style={styles.backToLoginText}>Back to Login</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
};

const { width: screenWidth } = Dimensions.get('window');
const cardPaddingHorizontal = 20;
const cardWidth = screenWidth * 0.9 - cardPaddingHorizontal * 2;
const boxSize = (cardWidth - 40) / 6;

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 10,
        paddingVertical: 24,
        paddingHorizontal: cardPaddingHorizontal,
        alignItems: 'center',
        width: '100%',
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        width: '100%',
    },
    inputBox: {
        width: boxSize,
        height: boxSize,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 24,
        color: '#000',
        textAlign: 'center',
        padding: 0,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
        textAlign: 'center',
    },
    phoneEmailText: {
        fontWeight: '700',
        fontSize: 18,
        marginBottom: 10,
        textAlign: 'center',
        color: '#000',
    },
    resendText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 20,
    },
    resendTimerText: {
        color: '#E10600',
        fontWeight: '700',
    },
    expireText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
    },
    expireTimerText: {
        color: '#E10600',
        fontWeight: '700',
    },
    verifyBtn: {
        backgroundColor: '#E10600',
        width: '100%',
        borderRadius: 6,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 10,
    },
    verifyBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    backupCodeText: {
        color: '#E10600',
        fontSize: 13,
        fontWeight: '600',
        marginVertical: 10,
        textAlign: 'center',
    },
    lostAppText: {
        color: '#999',
        fontSize: 12,
        marginBottom: 20,
        textAlign: 'center',
    },
    separator: {
        width: '90%',
        height: 1,
        backgroundColor: '#E0E0E0',
        marginBottom: 20,
    },
    backToLoginText: {
        color: '#E10600',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default VerificationCodeInput;
