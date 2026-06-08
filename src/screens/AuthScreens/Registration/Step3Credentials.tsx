import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { TextInputWithLabel } from '../../../components/TextInputWithLabel';
import { PasswordStrength } from '../../../components/PasswordStrength.tsx';
import { getPasswordStrength } from '../../../utils/password';
import { PasswordRules } from '../../../components/PasswordRules.tsx';
import PasswordTips from '../../../components/PasswordTips.tsx';

interface Step3CredentialsProps {
  password: string;
  onPasswordChange: (password: string) => void;
}

export const Step3Credentials = ({ password, onPasswordChange }: Step3CredentialsProps) => {
    const [username, setUsername] = useState('');

    const strength = useMemo(() => getPasswordStrength(password), [password]);

    return (
        <View>
            <Text style={styles.title}>Create Your Credentials</Text>
            <Text style={styles.subtitle}>Set a secure password for your account</Text>

            <TextInputWithLabel
                label="Email or username"
                value={username}
                onChangeText={setUsername}
            // editable={false}
            // rightIcon="check"
            />

            <TextInputWithLabel
                label="Password"
                secureTextEntry={true}
                value={password}
                onChangeText={onPasswordChange}
                placeholder="**********"
            // showPasswordStrength
            // strength={strength}
            />

            <PasswordStrength strength={strength} />
            <PasswordRules password={password} />


            <PasswordTips />

        </View>
    );
};

const styles = StyleSheet.create({
    title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },


});

