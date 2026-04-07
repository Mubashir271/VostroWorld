import { Image, ImageBackground, StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView } from 'react-native';
import React, { useState } from 'react';
import { useSnackbarStore } from '../../../redux/hooks/useSnackbar';
import { useNavigation } from '@react-navigation/native';
import PrimaryButton from './../../../components/PrimaryButton';
import { resetToLogin } from '../../../utils/navigationActions';


const Forgotquestions = () => {
    const { showSnackbar } = useSnackbarStore();
    const navigation = useNavigation();

    // State to hold answers for each question
    const [answers, setAnswers] = useState({
        firstSchool: '',
        childhoodFood: '',
        birthCity: '',
    });

    const handleChange = (key: string, value: string) => {
        setAnswers((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = () => {
        showSnackbar('Create New Password');
        navigation.navigate('CreateNewPassword' as never);
        // You can also navigate to the next screen here
    };

    return (
        <KeyboardAvoidingView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}>
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
                    <Image
                        source={require('../../../assets/img/questionmark.png')}
                        style={styles.lockImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Verify Your Identity</Text>
                    <Text style={styles.subtitle}>
                        Answer the security questions below to continue
                    </Text>

                    {/* Questions */}
                    <View style={styles.questionContainer}>
                        <Text style={styles.questionText}>1. What was the name of your first school?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your answer"
                            value={answers.firstSchool}
                            onChangeText={(text) => handleChange('firstSchool', text)}
                        />
                    </View>

                    <View style={styles.questionContainer}>
                        <Text style={styles.questionText}>2. What is your favorite childhood food?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your answer"
                            value={answers.childhoodFood}
                            onChangeText={(text) => handleChange('childhoodFood', text)}
                        />
                    </View>

                    <View style={styles.questionContainer}>
                        <Text style={styles.questionText}>3. What city were you born in?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your answer"
                            value={answers.birthCity}
                            onChangeText={(text) => handleChange('birthCity', text)}
                        />
                    </View>
                    <PrimaryButton
                        title="Verify Code"
                        onPress={handleSubmit}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    lostAppText: {
        color: '#999',
        fontSize: 12,
        marginVertical: 20,
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
        marginBottom: 6,
    },
    subtitle: {
        textAlign: 'center',
        color: '#666',
        fontSize: 13,
        marginBottom: 20,
    },
    questionContainer: {
        width: '100%',
        marginBottom: 20,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    questionText: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        backgroundColor: '#7B7B7B1A',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    submitBtn: {
        backgroundColor: '#E10600',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 10,
        width: '100%',
        alignItems: 'center',
    },
    submitBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
});

export default Forgotquestions

