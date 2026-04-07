import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SocialButton } from '../../../components/SocialButton';
import { Feature } from '../../../components/Feature';
import { Apple, Control, Dashboard, Google, Security } from '../../../assets/icons';


const WelcomeAdminScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../../../assets/img/welcome.png')} // background image
        style={styles.background}
        resizeMode="stretch"
      >
        {/* Logo */}
        <Image
          source={require('../../../assets/img/VostroLogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

      </ImageBackground>

      {/* Content */}
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to Vostro World Admin</Text>
        <Text style={styles.subtitle}>
          Manage Your Fitness Business Efficiently
        </Text>

        {/* Features */}
        <Feature
          title="Real-time Management"
          description="Monitor your gym operations anytime, anywhere"
          icon={Dashboard}
        />
        <Feature
          title="Complete Control"
          description="Manage members, staff, finances, and many more"
          icon={Control}
        />
        <Feature
          title="Data Security"
          description="Enterprise-grade security for your data"
          icon={Security}
        />

        {/* CTA */}
        <View style={styles.createButton}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Registration')}
          >
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
          </TouchableOpacity> */}

        {/* Login */}
        <Text style={styles.loginText}>
          Already have account?{' '}
          <Text
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            Sign In
          </Text>
        </Text>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.or}>OR</Text>
          <View style={styles.line} />
        </View>

        {/* Social */}
        <View style={styles.socialRow}>
          <SocialButton label="Login with Google" icon={Google} />
          <SocialButton label="Login with Apple" icon={Apple} />
        </View>
      </View>

    </SafeAreaView>
  );
};

export default WelcomeAdminScreen;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0, 0.55)',
  },
  background: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  logo: {
    height: 60,
    alignSelf: 'center',
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#00000029',
    backgroundColor: '#fff',
    marginTop: 16,
    borderRadius: 10,
    margin: 20
  },
  primaryButton: {
    backgroundColor: '#E51728',
    paddingVertical: 10,
    borderRadius: 10,   
  },
  primaryButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
  loginText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280'
  },
  loginLink: {
    color: '#FF0000',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDD',
  },
  or: {
    marginHorizontal: 8,
    color: '#FF0000',
    fontSize: 12,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

});
