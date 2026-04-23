import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native'
import React, { useState } from 'react'
import AppHeader from '../../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface EmailTemplate {
  id: string;
  title: string;
  trigger: string;
}

const EmailTemplates = () => {
  const navigation = useNavigation();
  const [templates, setTemplates] = useState<EmailTemplate[]>([
    {
      id: '1',
      title: 'Welcome Email',
      trigger: 'On Signup',
    },
    {
      id: '2',
      title: 'Payment Receipt',
      trigger: 'After Payment',
    },
  ]);

  const handleTemplatePress = (template: EmailTemplate) => {
    (navigation as any).navigate('EmailTemplateEditor', { template });
  };

  const handleSave = () => {
    Alert.alert('Success', 'Email templates saved successfully');
  };

  return (
    <>
      <AppHeader
        title="Email Templates"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Welcome Email */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Welcome Email</Text>
            <TouchableOpacity 
              style={styles.templateRow}
              onPress={() => handleTemplatePress(templates[0])}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.triggerLabel}>Trigger: {templates[0].trigger}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Payment Receipt */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Receipt</Text>
            <TouchableOpacity 
              style={styles.templateRow}
              onPress={() => handleTemplatePress(templates[1])}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.triggerLabel}>Trigger: {templates[1].trigger}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  )
}

export default EmailTemplates

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F8F8' 
  },
  scroll: { 
    flex: 1 
  },
  scrollContent: { 
    paddingBottom: 100,
    paddingTop: 16,
  },

  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  templateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  triggerLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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
  saveButton: {
    backgroundColor: '#E10600',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})
