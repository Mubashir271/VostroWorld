import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ImageBackground,
    Image,
    ActivityIndicator,
    ScrollView,
    Alert,
} from 'react-native';
import { useSnackbarStore } from '../../../redux/hooks/useSnackbar';
import CheckBox from '../../../components/Checkbox';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, setBiometricEnabled } from '../../../redux/slices/userSlice';
import { RootState } from '../../../redux/store';
import api from '../../../api/service';
import {
    checkBiometricAvailability,
    promptBiometric,
    saveCredentials,
    getCredentials,
} from '../../../utils/biometrics';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [biometricReady, setBiometricReady] = useState(false);

    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { showSnackbar } = useSnackbarStore();
    const biometricEnabled = useSelector((state: RootState) => state.user.biometricEnabled);

    // Check on mount whether biometric login is set up and ready
    useEffect(() => {
        const init = async () => {
            try {
                const { available } = await checkBiometricAvailability();
                if (!available || !biometricEnabled) return;
                const creds = await getCredentials();
                setBiometricReady(!!creds);
            } catch {
                // biometrics not available — ignore
            }
        };
        init();
    }, [biometricEnabled]);

    const doLogin = async (loginEmail: string, loginPassword: string) => {
        setLoading(true);
        try {
            const response = await api.post('/v1/auth/app-login', {
                email: loginEmail.trim(),
                password: loginPassword.trim(),
            });

            const { access_token, user } = response.data;
            if (!access_token) {
                showSnackbar('Authentication failed: no token received.');
                return;
            }

            dispatch(setUser({ token: access_token, user }));
            showSnackbar('Login successful!');
            setTimeout(() => {
                (navigation as any).reset({ index: 0, routes: [{ name: 'Drawer' }] });
            }, 500);

            return true; // success
        } catch (error: any) {
            if (error.response) {
                const { status, data } = error.response;
                if (status === 401) {
                    showSnackbar('Invalid email or password.');
                    return false;
                }
                if (status === 422 && data?.message) {
                    const msg = typeof data.message === 'object'
                        ? (Object.values(data.message).flat()[0] as string)
                        : data.message;
                    showSnackbar(msg || 'Validation error.');
                    return false;
                }
                showSnackbar(data?.message || `Login failed (${status}).`);
            } else if (error.code === 'ECONNABORTED') {
                showSnackbar('Request timed out. Please try again.');
            } else {
                showSnackbar('Network error. Please check your connection.');
            }
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            showSnackbar('Please enter email and password');
            return;
        }

        const success = await doLogin(email, password);
        if (!success) return;

        // After first successful login, offer to enable biometric
        try {
            const { available } = await checkBiometricAvailability();
            if (available && !biometricEnabled) {
                Alert.alert(
                    'Enable Biometric Login?',
                    'Next time you can log in with your fingerprint or Face ID.',
                    [
                        { text: 'Skip', style: 'cancel' },
                        {
                            text: 'Enable',
                            onPress: async () => {
                                await saveCredentials(email.trim(), password.trim());
                                dispatch(setBiometricEnabled(true));
                            },
                        },
                    ],
                );
            }
        } catch {
            // biometrics check failed silently — don't block the login flow
        }
    };

    const handleBiometricLogin = async () => {
        if (!biometricReady) return;
        try {
            const { success } = await promptBiometric('Log in to Vostro');
            if (!success) return;

            const creds = await getCredentials();
            if (!creds) {
                showSnackbar('No saved credentials. Please log in manually.');
                dispatch(setBiometricEnabled(false));
                return;
            }

            await doLogin(creds.email, creds.password);
        } catch {
            showSnackbar('Biometric authentication failed. Please try again.');
        }
    };

    const handleForgotPassword = () => {
        (navigation as any).navigate('ForgotPassword');
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

            {/* Red header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Welcome Back</Text>
                <Text style={styles.headerSubtitle}>Sign in to your account</Text>
            </View>

            {/* Login form */}
            <View style={styles.form}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                >
                    {/* Email */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Email or username</Text>
                        <View style={styles.inputRow}>
                            <Image
                                source={require('../../../assets/icons/user.png')}
                                style={styles.icon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter email or username"
                                placeholderTextColor="#999"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!loading}
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputRow}>
                            <Image
                                source={require('../../../assets/icons/lock.png')}
                                style={styles.icon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor="#999"
                                secureTextEntry={!passwordVisible}
                                value={password}
                                onChangeText={setPassword}
                                editable={!loading}
                            />
                            <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
                                <Image
                                    source={require('../../../assets/icons/eye.png')}
                                    style={[styles.icon, { marginRight: 0 }]}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.rowSpaceBetween}>
                            <TouchableOpacity
                                style={styles.rememberMe}
                                onPress={() => setRemember(!remember)}
                                activeOpacity={0.8}
                            >
                                <CheckBox
                                    checked={remember}
                                    onChange={() => setRemember(!remember)}
                                    borderColor="#999"
                                    backgroundColor="white"
                                    checkColor="#E10600"
                                />
                                <Text style={styles.rememberText}>Remember me</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleForgotPassword}>
                                <Text style={styles.forgotText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginBtnText}>Login</Text>
                        )}
                    </TouchableOpacity>

                    {/* Biometric Login */}
                    <TouchableOpacity
                        style={[
                            styles.biometricWrapper,
                            !biometricReady && styles.biometricDisabled,
                        ]}
                        onPress={handleBiometricLogin}
                        disabled={!biometricReady || loading}
                        activeOpacity={biometricReady ? 0.7 : 1}
                    >
                        <Image
                            source={require('../../../assets/icons/biomatric.png')}
                            style={[
                                styles.fingerprintIcon,
                                !biometricReady && { opacity: 0.35 },
                            ]}
                        />
                        <Text style={[styles.biometricText, !biometricReady && { color: '#bbb' }]}>
                            {biometricReady ? 'Biometric Login' : 'Biometric Login (not set up)'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Support text */}
            <Text style={styles.supportText}>Need help? Contact Support</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    topImage: { height: 200, justifyContent: 'center', alignItems: 'center' },
    logo: { width: 180, height: 80 },
    header: {
        backgroundColor: '#E10600',
        paddingVertical: 20,
        paddingHorizontal: 30,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18, marginBottom: 6 },
    headerSubtitle: { color: '#fff', fontWeight: '400', fontSize: 13 },
    form: { backgroundColor: '#fff', paddingHorizontal: 30, paddingVertical: 20, flex: 1 },
    inputWrapper: { marginBottom: 15 },
    label: { color: '#333', fontWeight: '600', marginBottom: 6 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0000001A',
        borderRadius: 8,
        paddingHorizontal: 10,
    },
    input: { flex: 1, height: 50, color: '#000' },
    icon: { width: 18, height: 18, tintColor: '#000000', marginRight: 10 },
    rowSpaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    rememberMe: { flexDirection: 'row', alignItems: 'center' },
    rememberText: { color: '#000000' },
    forgotText: { color: '#000000' },
    loginBtn: {
        backgroundColor: '#E10600',
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 20,
        alignItems: 'center',
    },
    loginBtnDisabled: { opacity: 0.7 },
    loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    biometricWrapper: { marginTop: 40, alignItems: 'center' },
    biometricDisabled: { opacity: 0.6 },
    fingerprintIcon: { width: 50, height: 50, marginBottom: 6 },
    biometricText: { fontWeight: '700' },
    supportText: { textAlign: 'center', paddingVertical: 15, color: '#666', fontSize: 12 },
});

export default Login;
