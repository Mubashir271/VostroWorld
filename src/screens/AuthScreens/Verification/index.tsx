// src/screens/auth/VerificationMethod.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import Footer from '../../../components/Footer';
import { resetToLogin } from '../../../utils/navigationActions';

type Method = 'sms' | 'email' | 'security';

const { width } = Dimensions.get('window');

const VerificationMethod = () => {
  const navigation = useNavigation();
  const [selected, setSelected] = useState<Method | null>(null);
  
  // Get user data from Redux
  const { phone, email } = useSelector((state: RootState) => state.user.registrationData);

  // Mask phone number to show only last 3 digits
  const maskPhone = (phoneStr: string) => {
    if (!phoneStr) return '+92 300-**** ***';
    return phoneStr.slice(0, -3) + '***';
  };

  // Mask email to show privacy
  const maskEmail = (emailStr: string) => {
    if (!emailStr) return 'user@example.com';
    const parts = emailStr.split('@');
    if (parts.length !== 2) return 'user@example.com';
    
    const localPart = parts[0];
    const domain = parts[1];
    
    const maskedLocal = localPart.length > 3 
      ? localPart.substring(0, 3) + '*'.repeat(Math.max(1, localPart.length - 6)) + localPart.substring(Math.max(3, localPart.length - 3))
      : localPart;
    
    return `${maskedLocal}@${domain}`;
  };

  const handleContinue = () => {
    if (!selected) return;

    if (selected === 'security') {
      navigation.navigate('SecurityQuestions' as never);
    } else if (selected === 'sms') {
      navigation.navigate('SMS' as never);
    } else if (selected === 'email') {
      navigation.navigate('Email' as never);
    } else {
      navigation.replace('OtpVerify' as never, { type: selected } as never);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../../assets/img/VerificationImage.png')}
        style={styles.topImage}
        resizeMode="stretch"
      >
        <Image
          source={require('../../../assets/img/VostroLogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </ImageBackground>

      {/* White Card */}
      <View style={styles.card}>
        <Image
          source={require('../../../assets/img/verificationlock.png')}
          style={styles.lockImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>Choose a Verification Method</Text>
        <Text style={styles.subtitle}>
          Select one option to verify your identity
        </Text>

        {/* OTP via SMS */}
        <TouchableOpacity
          style={[styles.option, selected === 'sms' && styles.optionActive]}
          onPress={() => setSelected('sms')}
          activeOpacity={0.8}
        >
          <View style={styles.iconWrapper}>
            <Image
              source={require('../../../assets/icons/sms.png')}
              style={styles.icon}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>OTP via SMS</Text>
            <Text style={styles.optionSub}>
              Code will send to{'\n'}
              <Text style={styles.phoneNumber}>{maskPhone(phone)}</Text>
            </Text>

          </View>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>

        {/* OTP via Email */}
        <TouchableOpacity
          style={[styles.option, selected === 'email' && styles.optionActive]}
          onPress={() => setSelected('email')}
          activeOpacity={0.8}
        >
          <View style={styles.iconWrapper}>
            <Image
              source={require('../../../assets/icons/email.png')}
              style={styles.icon}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>OTP via Email</Text>
            <Text style={styles.optionSub}>Code will send to{'\n'}
              <Text style={styles.phoneNumber}>{maskEmail(email)}</Text>
            </Text>
          </View>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>

        {/* Security Questions */}
        <TouchableOpacity
          style={[styles.option, selected === 'security' && styles.optionActive]}
          onPress={() => setSelected('security')}
          activeOpacity={0.8}
        >
          <View style={styles.iconWrapper}>
            <Image
              source={require('../../../assets/icons/securityquestion.png')}
              style={styles.icon}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Answer Security Questions</Text>
            <Text style={styles.optionSub}>Verify using your saved security questions</Text>
          </View>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
      <Footer
        text="Back to Login"
        onPress={() => resetToLogin(navigation)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#E10600', // matches your red header background
  },
  topImage: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    width: 180,
    height: 80,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    // marginHorizontal: 20,
    marginTop: -40, // pull up on top image for overlap effect
    borderRadius: 40,
    padding: 24,
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#F6F6F6',
    marginBottom: 14,
  },
  optionActive: {
    borderWidth: 2,
    borderColor: '#E10600',
    backgroundColor: '#FFF',
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFD8D7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },

  optionTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: '#333',
  },
  optionSub: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  phoneNumber: {
    color: '#000',
    fontWeight: '600',
    paddingTop: 2,
  },
  optionArrow: {
    fontSize: 22,
    color: '#E10600',
    fontWeight: '700',
  },
  continueBtn: {
    backgroundColor: '#E10600',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  backText: {
    textAlign: 'center',
    color: '#E10600',
    marginTop: 20,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default VerificationMethod;
