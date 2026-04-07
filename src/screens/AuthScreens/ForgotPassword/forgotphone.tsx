import React from 'react';
import { Image, ImageBackground, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import VerificationCodeInput from '../../../components/VerificationCodeInput';
import { useSnackbarStore } from '../../../redux/hooks/useSnackbar';
import { useNavigation } from '@react-navigation/native';
import ForgotCodeInput from '../../../components/ForgotCodeInput';
import PrimaryButton from '../../../components/PrimaryButton';

const ForgotPhone = () => {
    const { showSnackbar } = useSnackbarStore();
    const navigation = useNavigation();

    const handleVerify = () => {
        showSnackbar('Create New Password')
        navigation.navigate('CreateNewPassword' as never);
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

            <View style={styles.card}>
                <Image
                    source={require('../../../assets/img/authenticatoricon.png')}
                    style={styles.lockImage}
                    resizeMode="contain"
                />
                <Text style={styles.title}>Verify your Identity</Text>
                <ForgotCodeInput
                    phoneOrEmail="+92 333-**** 789"
                />

                <View style={{marginTop: '20%'}}>
                    <PrimaryButton
                        title="Verify Code"
                    onPress={handleVerify}
                    />
                </View>
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
    header: {
        backgroundColor: '#E10600',
        paddingVertical: 20,
        paddingHorizontal: 30,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        // marginHorizontal: 20,
        marginTop: -40, // pull up on top image for overlap effect
        borderRadius: 40,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    lockImage: {
        width: 100,
        height: 100,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 20,
    },
    subtitle: {
        textAlign: 'center',
        color: '#666',
        fontSize: 13,
    },
})
export default ForgotPhone;
