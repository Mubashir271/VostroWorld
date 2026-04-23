import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native'
import React, { useState } from 'react'
import AppHeader from '../../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

interface EmailTemplate {
  id: string;
  title: string;
  trigger: string;
}

const EmailTemplateEditor = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const template = (route.params as any)?.template as EmailTemplate;

  const [toEmail, setToEmail] = useState('user@example.com');
  const [subject, setSubject] = useState(template?.title || '');
  const [body, setBody] = useState('Dear User,\n\nWelcome to our platform!\n\nBest regards');

  const handleSave = () => {
    if (!toEmail.trim() || !subject.trim() || !body.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    Alert.alert('Success', 'Email template saved successfully');
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <>
      <AppHeader
        title={template?.title || 'Email Template'}
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* To Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>To</Text>
            <TextInput
              style={styles.input}
              placeholder="Recipient email"
              placeholderTextColor="#999"
              value={toEmail}
              onChangeText={setToEmail}
              keyboardType="email-address"
            />
          </View>

          {/* Subject Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Email subject"
              placeholderTextColor="#999"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          {/* Body Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Body</Text>
            <TextInput
              style={[styles.input, styles.bodyInput]}
              placeholder="Email body"
              placeholderTextColor="#999"
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleSave}>
            <Text style={styles.continueButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  )
}

export default EmailTemplateEditor

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F8F8' 
  },
  scroll: { 
    flex: 1 
  },
  scrollContent: { 
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },

  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  bodyInput: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 120,
  },

  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  continueButton: {
    backgroundColor: '#E10600',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#E10600',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#E10600',
    fontSize: 16,
    fontWeight: '700',
  },
})
