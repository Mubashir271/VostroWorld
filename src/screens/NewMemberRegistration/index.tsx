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
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

const NewMemberRegistrationScreen = () => {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);


  const handleDateConfirm = (date: Date) => {
    const formatted = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }); // → "25 Apr 2026"
    updateForm('startDate', formatted);
    setDatePickerVisible(false);
  };

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
  const membershipPackages: Record<string, { name: string; price: string; desc: string }> = {
    'GYM': { name: 'GYM - Monthly', price: 'PKR 8,000', desc: 'Full gym access - 1 month' },
    'Personal Training': { name: 'PT - 3 Months', price: 'PKR 25,000', desc: 'Personal training - 3 months' },
    'Guest Pass': { name: 'Guest Pass - Day', price: 'PKR 1,500', desc: 'Single day access' },
    'Nutrition Program': { name: 'Nutrition - Monthly', price: 'PKR 10,000', desc: 'Dietary guidance - 1 month' },
    'Boot Camp': { name: 'Boot Camp - Monthly', price: 'PKR 12,000', desc: 'Group fitness - 1 month' },
    'Cafe Membership': { name: 'Cafe - Monthly', price: 'PKR 5,000', desc: 'Cafe access - 1 month' },
  };

  const selectedPackage = membershipPackages[formData.membershipType];
  const [voucher, setVoucher] = useState('');
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  const VOUCHER_DISCOUNT = 1500;

  const applyVoucher = () => {
    if (voucher.trim().length > 0) setVoucherApplied(true);
  };

  // Derive prices from selectedPackage
  const originalPrice = parseInt(selectedPackage.price.replace(/[^0-9]/g, ''));
  const discountPercent = 10;
  const discountAmount = Math.round(originalPrice * discountPercent / 100);
  const priceAfterDiscount = originalPrice - discountAmount;
  const finalPrice = voucherApplied ? priceAfterDiscount - VOUCHER_DISCOUNT : priceAfterDiscount;
  const deposit = parseInt(depositAmount.replace(/[^0-9]/g, '') || '0');
  const remainingBalance = finalPrice - deposit;
  const [termsAccepted, setTermsAccepted] = useState(false);

  return (
    <>
      <AppHeader
        title="New Member Registration"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.container}>
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
            <View style={styles.card}>
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

              {/* <TouchableOpacity style={styles.redButton} onPress={nextStep}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity> */}
            </View>
          )}

          {/* STEP 2 - Membership Type & Package */}

          {currentStep === 2 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Select Membership Type</Text>
              <View style={styles.membershipGrid}>
                {[
                  { key: 'GYM', label: 'GYM', icon: 'dumbbell', desc: 'Membership access to gym facilities' },
                  { key: 'Personal Training', label: 'Personal Training', icon: 'arm-flex', desc: 'One - on - one coaching' },
                  { key: 'Guest Pass', label: 'Guest Pass', icon: 'ticket-confirmation', desc: 'Short- term access' },
                  { key: 'Nutrition Program', label: 'Nutrition Program', icon: 'food-apple', desc: 'Dietary guidance' },
                  { key: 'Boot Camp', label: 'Boot Camp', icon: 'fire', desc: 'Group fitness sessions' },
                  { key: 'Cafe Membership', label: 'Cafe Membership', icon: 'coffee', desc: 'Membership access to gym facilities' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.membershipCard,
                      formData.membershipType === type.key && styles.membershipCardActive,
                    ]}
                    onPress={() => updateForm('membershipType', type.key)}
                  >
                    <Icon
                      name={type.icon}
                      size={32}
                      color={formData.membershipType === type.key ? '#E63946' : '#888'}
                    />
                    <Text style={[
                      styles.membershipLabel,
                      formData.membershipType === type.key && styles.membershipLabelActive,
                    ]}>
                      {type.label}
                    </Text>
                    <Text style={styles.membershipDesc}>{type.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Select Package</Text>
              <TouchableOpacity style={styles.packageCard}>
                <View style={styles.packageRow}>
                  <View style={styles.packageLeft}>
                    <Text style={styles.packageFlag}>🇵🇰</Text>
                    <View>
                      <Text style={styles.packageTitle}>{selectedPackage.name}</Text>
                      <Text style={styles.packagePrice}>{selectedPackage.price}</Text>
                      <Text style={styles.packageDesc}>{selectedPackage.desc}</Text>
                    </View>
                  </View>
                  <Icon name="check-circle" size={26} color="#E63946" />
                </View>
              </TouchableOpacity>

              <Text style={styles.label}>Membership Start Date</Text>
              <TouchableOpacity
                style={styles.dateInputWrapper}
                onPress={() => setDatePickerVisible(true)}
              >
                <Text style={[styles.input, { flex: 1, color: '#1A1A1A' }]}>
                  {formData.startDate}
                </Text>
                <Icon name="calendar-month" size={22} color="#E63946" />
              </TouchableOpacity>

              <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                minimumDate={new Date()}
                onConfirm={handleDateConfirm}
                onCancel={() => setDatePickerVisible(false)}
              />
            </View>
          )}

          {/* STEP 3 - Price & Payment */}
          {/* STEP 3 - Price & Payment */}
          {currentStep === 3 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Package Price</Text>
              <View style={styles.priceBox}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Original Price</Text>
                  <Text style={styles.priceValue}>PKR {originalPrice.toLocaleString()}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Discount</Text>
                  <Text style={styles.discountText}>-{discountPercent}%</Text>
                </View>
                <View style={styles.finalPriceRow}>
                  <Text style={styles.finalLabel}>Final Price</Text>
                  <Text style={styles.finalPrice}>PKR {finalPrice.toLocaleString()}</Text>
                </View>
              </View>

              {/* Voucher */}
              <View style={styles.voucherRow}>
                <TextInput
                  style={styles.voucherInput}
                  placeholder="Enter voucher code"
                  placeholderTextColor="#AAA"
                  value={voucher}
                  onChangeText={setVoucher}
                />
                <TouchableOpacity style={styles.applyBtn} onPress={applyVoucher}>
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
              {voucherApplied && (
                <View style={styles.voucherSuccess}>
                  <Icon name="check-circle" size={16} color="#2ECC71" />
                  <Text style={styles.voucherSuccessText}>
                    Discount Applied: PKR {VOUCHER_DISCOUNT.toLocaleString()} discount has been applied.
                  </Text>
                </View>
              )}

              {/* Payment Method */}
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.paymentBox}>
                {['Cash', 'Bank Transfer', 'Credit / Debit Card', 'Online Payment', 'Installment'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={styles.radioRow}
                    onPress={() => updateForm('paymentMethod', method)}
                  >
                    <View style={styles.radioOuter}>
                      {formData.paymentMethod === method && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>{method}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Deposit Amount */}
              <Text style={styles.sectionTitle}>Deposit Amount</Text>
              <TextInput
                style={styles.input}
                placeholder={`${finalPrice.toLocaleString()} PKR`}
                placeholderTextColor="#AAA"
                keyboardType="numeric"
                value={depositAmount}
                onChangeText={setDepositAmount}
              />
              {deposit > 0 && (
                <Text style={styles.remainingText}>
                  Remaining Balance: PKR {remainingBalance.toLocaleString()}
                </Text>
              )}
            </View>
          )}


          {/* STEP 4 - Summary */}
          {/* STEP 4 - Summary */}
          {currentStep === 4 && (
            <View style={styles.card}>

              {/* Profile Header */}
              <View style={styles.summaryProfileRow}>
                <View style={styles.bigAvatar}>
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.bigAvatarImage} />
                  ) : (
                    <Text style={styles.bigAvatarText}>
                      {formData.firstName ? formData.firstName[0].toUpperCase() : 'A'}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {formData.firstName || 'Ahmed'} {formData.lastName || 'Khan'}
                  </Text>
                  <Text style={styles.memberId}>{formData.phone || '+92 3** *******'}</Text>
                  <Text style={styles.memberId}>#M-1234</Text>
                </View>
                <TouchableOpacity onPress={() => setCurrentStep(1)}>
                  <View style={styles.editBtn}>
                    <Icon name="pencil" size={14} color="#FFF" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Member Info Section */}
              <Text style={styles.summarySectionTitle}>Member Info</Text>
              <View style={styles.summarySection}>
                <View style={styles.summaryRow}>
                  <Icon name="check-circle" size={20} color="#E63946" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryRowTitle}>
                      {formData.firstName || 'Ahmed'} {formData.lastName || 'Khan'}
                    </Text>
                    <Text style={styles.summaryRowSub}>{formData.phone || '+92 3** *******'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setCurrentStep(1)}>
                    <View style={styles.editBtn}>
                      <Icon name="pencil" size={14} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Package Info Section */}
              <Text style={styles.summarySectionTitle}>Package Info</Text>
              <View style={styles.summarySection}>
                <View style={styles.summaryRow}>
                  <Icon name="check-circle" size={20} color="#E63946" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryRowTitle}>{formData.membershipType}</Text>
                    <Text style={styles.summaryRowSub}>{selectedPackage.name}</Text>
                    <Text style={styles.summaryRowSub}>Start Date: {formData.startDate}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setCurrentStep(2)}>
                    <View style={styles.editBtn}>
                      <Icon name="pencil" size={14} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Payment Method Section */}
              <Text style={styles.summarySectionTitle}>Payment Method</Text>
              <View style={styles.summarySection}>
                <View style={styles.summaryRow}>
                  <Icon name="check-circle" size={20} color="#E63946" />
                  <Text style={[styles.summaryRowTitle, { flex: 1 }]}>{formData.paymentMethod}</Text>
                  <TouchableOpacity onPress={() => setCurrentStep(3)}>
                    <View style={styles.editBtn}>
                      <Icon name="pencil" size={14} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Terms Checkbox */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setTermsAccepted(prev => !prev)}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
                  {termsAccepted && <Icon name="check" size={14} color="#FFF" />}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>terms and conditions</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.redButton}
                onPress={() => {
                  navigation.navigate('Drawer', {
                    screen: 'Members',
                  });
                }}
              >
                <Text style={styles.buttonText}>Confirm Registration</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          {currentStep < 4 && (
            <TouchableOpacity style={styles.redButton} onPress={nextStep}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </>
  );
};

export default NewMemberRegistrationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D9D9D9',
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
    width: 16,
    height: 16,
    borderRadius: 8,
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
    fontWeight: 800,
    color: '##000000',
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
    marginVertical: 20,
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
  membershipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  membershipCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  membershipCardActive: {
    backgroundColor: '#FFF0F0',
    borderColor: '#E63946',
    borderWidth: 2,
  },
  membershipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444',
    textAlign: 'center',
    marginTop: 6,
  },
  membershipLabelActive: {
    color: '#E63946',
  },
  membershipDesc: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  packageFlag: {
    fontSize: 22,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingRight: 12,
  },
  calendarIcon: {
    marginLeft: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#555',
  },
  priceValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  voucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 12,
    backgroundColor: '#F8F8F8',
  },
  voucherInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#1A1A1A',
  },
  applyBtn: {
    backgroundColor: '#E63946',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  applyBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  voucherSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  voucherSuccessText: {
    fontSize: 13,
    color: '#2ECC71',
    flexShrink: 1,
  },
  paymentBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    gap: 14,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E63946',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E63946',
  },
  radioLabel: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  remainingText: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    marginLeft: 2,
  },
  summaryProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 4,
  },
  bigAvatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  summarySectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  summarySection: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  summaryRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  summaryRowSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E63946',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxActive: {
    backgroundColor: '#E63946',
    borderColor: '#E63946',
  },
  termsLink: {
    color: '#E63946',
    fontWeight: '600',
  },
});