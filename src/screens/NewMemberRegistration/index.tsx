import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';

const NewMemberRegistrationScreen = () => {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'Male',
    dob: '',
    cnic: '',
    address: '',
    city: 'Islamabad',
    country: 'Pakistan',
    membershipType: 'Personal Training',
    package: 'PT - 3 Months',
    startDate: '25 Apr 2026',
    paymentMethod: 'Cash',
  });

  const updateForm = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => currentStep < 4 && setCurrentStep(currentStep + 1);
  const prevStep = () => currentStep > 1 && setCurrentStep(currentStep - 1);

  const [photoUri, setPhotoUri] = useState<string | null>(null);

const handlePickPhoto = () => {
  launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
    if (response.assets && response.assets[0]?.uri) {
      setPhotoUri(response.assets[0].uri);
    }
  });
};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Member Registration</Text>
        <Icon name="bell-outline" size={24} color="#1A1A1A" />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((step, index) => (
          <View key={step} style={styles.progressWrapper}>
            <View style={[
              styles.progressDot,
              step <= currentStep && styles.progressDotActive
            ]} />
            {index < 3 && (
              <View style={[
                styles.progressLine,
                step < currentStep && styles.progressLineActive
              ]} />
            )}
          </View>
        ))}
      </View>

      <Text style={styles.stepText}>Step {currentStep} of 4</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* STEP 1 - Basic Info */}
        {currentStep === 1 && (
          <View style = {styles.card}>
<TouchableOpacity style={styles.photoContainer} onPress={handlePickPhoto}>
  <View style={styles.photoCircle}>
    {photoUri ? (
      <Image
        source={{ uri: photoUri }}
        style={{ width: 96, height: 96, borderRadius: 48 }}
      />
    ) : (
      <>
        <Icon name="camera" size={32} color="#E63946" />
        <Text style={styles.addPhotoText}>Add Photo</Text>
      </>
    )}
  </View>
</TouchableOpacity>

            <View style={styles.inputRow}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>First Name<Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} placeholder="First Name" value={formData.firstName} onChangeText={(v) => updateForm('firstName', v)} />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Last Name<Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} placeholder="Last Name" value={formData.lastName} onChangeText={(v) => updateForm('lastName', v)} />
              </View>
            </View>

            <Text style={styles.label}>Email<Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.input} placeholder="@example.com" keyboardType="email-address" value={formData.email} onChangeText={(v) => updateForm('email', v)} />

            <Text style={styles.label}>Phone Number<Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.input} placeholder="+92 300-0000000" keyboardType="phone-pad" value={formData.phone} onChangeText={(v) => updateForm('phone', v)} />

            <Text style={styles.label}>Gender<Text style={styles.required}>*</Text></Text>
            <View style={styles.genderContainer}>
              {['Male', 'Female', 'Other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, formData.gender === g && styles.genderBtnActive]}
                  onPress={() => updateForm('gender', g)}
                >
                  <Text style={formData.gender === g ? styles.genderTextActive : styles.genderText}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date of Birth */}
            <Text style={styles.label}>Date of Birth<Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY"
              value={formData.dob}
              onChangeText={(v) => updateForm('dob', v)}
            />

            {/* CNIC / ID Number */}
            <Text style={styles.label}>CNIC / ID Number</Text>
            <TextInput
              style={styles.input}
              placeholder="CNIC / ID Number"
              value={formData.cnic}
              onChangeText={(v) => updateForm('cnic', v)}
            />

            {/* Address */}
            <Text style={styles.label}>Address<Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input]}
              placeholder="City"
              multiline
              value={formData.address}
              onChangeText={(v) => updateForm('address', v)}
            />

            {/* City & Country */}
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={styles.input}
                  value={formData.country}
                  onChangeText={(v) => updateForm('country', v)}
                />

            <TouchableOpacity style={styles.redButton} onPress={nextStep}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2 - Membership Type & Package */}
        {currentStep === 2 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Select Membership Type</Text>
            {/* You can add cards here for Gym, PT, Guest Pass etc. */}

            <Text style={styles.sectionTitle}>Select Package</Text>
            <View style={styles.packageCard}>
              <Text style={styles.packageTitle}>PT - 3 Months</Text>
              <Text style={styles.packagePrice}>PKR 25,000</Text>
              <Text style={styles.packageDesc}>Personal training - 3 months</Text>
            </View>

            <Text style={styles.label}>Membership Start Date</Text>
            <TextInput style={styles.input} value={formData.startDate} editable={false} />

            <TouchableOpacity style={styles.redButton} onPress={nextStep}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3 - Price & Payment */}
        {currentStep === 3 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Package Price</Text>
            <View style={styles.priceBox}>
              <View style={styles.priceRow}>
                <Text>Original Price</Text>
                <Text>PKR 15,000</Text>
              </View>
              <View style={styles.priceRow}>
                <Text>Discount</Text>
                <Text style={styles.discountText}>-10%</Text>
              </View>
              <View style={styles.finalPriceRow}>
                <Text style={styles.finalLabel}>Final Price</Text>
                <Text style={styles.finalPrice}>PKR 13,500</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Payment Method</Text>
            {['Cash', 'Bank Transfer', 'Credit / Debit Card', 'Online Payment', 'Installment'].map((method) => (
              <TouchableOpacity
                key={method}
                style={[styles.paymentOption, formData.paymentMethod === method && styles.paymentOptionActive]}
                onPress={() => updateForm('paymentMethod', method)}
              >
                <Text>{method}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.redButton} onPress={nextStep}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 4 - Summary */}
        {currentStep === 4 && (
          <View style={styles.card}>
            <View style={styles.summaryCard}>
              <View style={styles.profileHeader}>
                <View style={styles.bigAvatar}>
                  <Text style={styles.bigAvatarText}>A</Text>
                </View>
                <View>
                  <Text style={styles.memberName}>Ahmed Khan</Text>
                  <Text style={styles.memberId}>#M-1234</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Member Info</Text>
              <Text style={styles.summaryText}>Ahmed Khan (+92 3** *** ***)</Text>

              <Text style={styles.sectionTitle}>Package Info</Text>
              <Text style={styles.summaryText}>Personal Training - 3 Months</Text>
              <Text style={styles.summaryText}>Start Date: 25 Apr 2026</Text>

              <Text style={styles.sectionTitle}>Payment Method</Text>
              <Text style={styles.summaryTextRed}>{formData.paymentMethod}</Text>
            </View>

            <View style={styles.termsRow}>
              <Switch value={true} trackColor={{ true: '#E63946' }} />
              <Text style={styles.termsText}>I agree to the terms and conditions</Text>
            </View>

            <TouchableOpacity style={styles.redButton} onPress={() => alert('Member Registered Successfully!')}>
              <Text style={styles.buttonText}>Confirm Registration</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NewMemberRegistrationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D9D9D9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 14
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  progressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    // flex: 1,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  progressDotActive: {
    backgroundColor: '#E63946',
    borderColor: '#E63946',
  },
  progressLine: {
    // flex: 1,
    width: 50,
    height: 3,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#E63946',
  },
  stepText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 100,
  },

  /* Photo */
  photoContainer: {
    // alignItems: 'center',
    marginVertical: 20,
  },
  photoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E63946',
  },
  addPhotoText: {
    marginTop: 8,
    color: '#E63946',
    fontWeight: '600',
  },

  /* Inputs */
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 6,
  },
  required: {
    color: '#E63946',
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },

  /* Gender */
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 8,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  genderBtnActive: {
    backgroundColor: '#E63946',
    borderColor: '#E63946',
  },
  genderText: {
    color: '#666',
  },
  genderTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },

  /* Section Titles */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 24,
    marginBottom: 12,
  },

  /* Package Card */
  packageCard: {
    backgroundColor: '#FFF0F0',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E63946',
    marginBottom: 20,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E63946',
    marginVertical: 4,
  },
  packageDesc: {
    color: '#666',
  },

  /* Price Box */
  priceBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  discountText: {
    color: '#E63946',
  },
  finalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 12,
    marginTop: 8,
  },
  finalLabel: {
    fontWeight: '600',
  },
  finalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E63946',
  },

  /* Payment Options */
  paymentOption: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  paymentOptionActive: {
    backgroundColor: '#FFF0F0',
    borderWidth: 2,
    borderColor: '#E63946',
  },

  /* Summary */
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  bigAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigAvatarText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },
  memberName: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberId: {
    color: '#666',
  },
  summaryText: {
    fontSize: 15,
    marginBottom: 6,
  },
  summaryTextRed: {
    fontSize: 16,
    color: '#E63946',
    fontWeight: '600',
  },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 14,
    color: '#333',
  },

  /* Buttons */
  redButton: {
    backgroundColor: '#E63946',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: '#E63946',
    fontSize: 16,
    fontWeight: '600',
  },
});