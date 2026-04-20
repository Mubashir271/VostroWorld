import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ImageBackground,
    Image,
} from 'react-native';
// import { Checkbox } from 'react-native-paper';  // import Checkbox from react-native-paper
import { showSnackbar } from '../../../redux/slices/snackbarSlice';
import { useSnackbarStore } from '../../../redux/hooks/useSnackbar';
import CheckBox from '../../../components/Checkbox';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../redux/store';
import { setUser } from '../../../redux/slices/userSlice';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { showSnackbar } = useSnackbarStore(); // ✅ get showSnackbar

    // Get saved registration data from Redux
    const { firstName, lastName, email: savedEmail, phone: savedPhone, password: savedPassword } = useSelector(
        (state: RootState) => state.user.registrationData
    );

    // Create list of saved credentials
    const savedCredentials = [
        { label: `${firstName} ${lastName}`.trim(), value: savedEmail },
        { label: 'Phone', value: savedPhone },
    ].filter(cred => cred.value); // Only show if value exists

    const handleLogin = async () => {
        // 1. validate inputs
        if (!email || !password) {
            showSnackbar('Please enter email and password')
            return;
        }

        // 2. Verify email matches saved email
        if (email !== savedEmail) {
            showSnackbar('Invalid email. Email not registered.');
            return;
        }

        // 3. Verify password matches saved password
        if (password !== savedPassword) {
            showSnackbar('Invalid password. Please try again.');
            return;
        }

        // 4. Create dummy token and persist it
        const dummyToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        dispatch(setUser(dummyToken));

        // 5. Login successful - navigate to Verification
        showSnackbar('Login successful!');
        setTimeout(() => {
            (navigation as any).replace('Verification');
        }, 500);
    };

    const handleUseSavedCredential = (credential: string) => {
        setEmail(credential);
    };

    const handleForgotPassword = () => {
        (navigation as any).navigate('ForgotPassword')
    }

    return (
        <View style={styles.container}>
            {/* Top image section */}
            <ImageBackground
                source={require('../../../assets/img/login.png')} // your top background image
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
                <Text style={styles.headerSubtitle}>Sign in to your admin account</Text>
            </View>

            {/* Login form */}
            <View style={styles.form}>
                {/* Email */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Email or username</Text>
                    <View style={styles.inputRow}>
                        <Image
                            source={require('../../../assets/icons/user.png')} // add your user icon here
                            style={styles.icon}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter email or username"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                        />
                    </View>
                    
                    {/* Saved Credentials Quick Select */}
                    {/* {savedCredentials.length > 0 && (
                        <View style={styles.savedCredentialsContainer}>
                            <Text style={styles.savedCredentialsLabel}>Or use saved credentials:</Text>
                            {savedCredentials.map((cred, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.savedCredentialBtn}
                                    onPress={() => handleUseSavedCredential(cred.value)}
                                >
                                    <Text style={styles.savedCredentialText}>{cred.label}</Text>
                                    <Text style={styles.savedCredentialValue}>{cred.value}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )} */}
                </View>

                {/* Password */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputRow}>
                        <Image
                            source={require('../../../assets/icons/lock.png')} // add your password icon here
                            style={styles.icon}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your password"
                            placeholderTextColor="#999"
                            secureTextEntry={!passwordVisible}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity
                            onPress={() => setPasswordVisible(!passwordVisible)}
                        >
                            <Image
                                source={
                                    passwordVisible
                                        ? require('../../../assets/icons/eye.png') // eye-off icon for visible password
                                        : require('../../../assets/icons/eye.png') // eye icon for hidden password
                                }
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
                <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
                    <Text style={styles.loginBtnText}>Login</Text>
                </TouchableOpacity>

                {/* Biometric Login */}
                <TouchableOpacity style={styles.biometricWrapper}>
                    <Image
                        source={require('../../../assets/icons/biomatric.png')} // add fingerprint icon
                        style={styles.fingerprintIcon}
                    />
                    <Text style={styles.biometricText}>Biometric Login</Text>
                </TouchableOpacity>
            </View>

            {/* Support text */}
            <Text style={styles.supportText}>Need help? Contact Support</Text>
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
    header: {
        backgroundColor: '#E10600',
        paddingVertical: 20,
        paddingHorizontal: 30,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',

    },
    headerTitle: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
        marginBottom: 6,
    },
    headerSubtitle: {
        color: '#fff',
        fontWeight: '400',
        fontSize: 13,
    },
    form: {
        backgroundColor: '#fff',
        paddingHorizontal: 30,
        paddingVertical: 20,
        flex: 1,
    },
    inputWrapper: {
        marginBottom: 15,
    },
    label: {
        color: '#333',
        fontWeight: '600',
        marginBottom: 6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0000001A',
        borderRadius: 8,
        paddingHorizontal: 10,
    },
    input: {
        flex: 1,
        height: 50,
        color: '#000',
    },
    icon: {
        width: 18,
        height: 18,
        tintColor: '#000000',
        marginRight: 10,
    },
    rowSpaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    rememberMe: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rememberText: {
        // marginLeft: 4,
        color: '#000000',
    },
    forgotText: {
        color: '#000000',
        // fontWeight: '600',
    },
    loginBtn: {
        backgroundColor: '#E10600',
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 20,
        alignItems: 'center',
    },
    loginBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    biometricWrapper: {
        marginTop: 40,
        alignItems: 'center',
    },
    fingerprintIcon: {
        width: 50,
        height: 50,
        // tintColor: '#E10600',
        marginBottom: 6,
    },
    biometricText: {
        // color: '#E10600',
        fontWeight: '700',
    },
    supportText: {
        textAlign: 'center',
        paddingVertical: 15,
        color: '#666',
        fontSize: 12,
    },
    savedCredentialsContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    savedCredentialsLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
        marginBottom: 8,
    },
    savedCredentialBtn: {
        backgroundColor: '#FFF5F5',
        padding: 10,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#E10600',
    },
    savedCredentialText: {
        fontSize: 13,
        color: '#333',
        fontWeight: '600',
        marginBottom: 2,
    },
    savedCredentialValue: {
        fontSize: 12,
        color: '#666',
    },
});

export default Login;
