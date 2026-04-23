import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';

const SMTP = () => {
  const navigation = useNavigation();
  const [to, setTo] = useState('abc@gamil.com');
  const [subject, setSubject] = useState('This is test mail');
  const [body, setBody] = useState('This is test email');

  const handleContinue = () => {
    if (!to || !subject || !body) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    Alert.alert('Success', 'SMTP settings configured successfully!');
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <>
      <AppHeader
        title="SMTP settings"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* To Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>To</Text>
          <TextInput
            style={styles.input}
            placeholder="abc@gamil.com"
            placeholderTextColor="#999"
            value={to}
            onChangeText={setTo}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Subject Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="This is test mail"
            placeholderTextColor="#999"
            value={subject}
            onChangeText={setSubject}
          />
        </View>

        {/* Body Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Body</Text>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            placeholder="This is test email"
            placeholderTextColor="#999"
            value={body}
            onChangeText={setBody}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.spacer} />

        {/* Continue Button */}
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
      </SafeAreaView>
    </>
  )
}

export default SMTP

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 100,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#333',
  },
  bodyInput: {
    paddingTop: 14,
    minHeight: 120,
  },
  spacer: {
    height: 40,
  },
  continueBtn: {
    backgroundColor: '#E10600',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E10600',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#E10600',
    fontSize: 16,
    fontWeight: '700',
  },
})