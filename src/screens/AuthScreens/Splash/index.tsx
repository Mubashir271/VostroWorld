import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  ImageBackground,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';

const Splash = ({ navigation }: { navigation: any }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const token = useSelector((state: RootState) => state.user.token);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start(() => {
      // Check if user has a token (is logged in)
      if (token) {
        navigation.replace('Drawer'); // Go to main drawer/app if logged in
      } else {
        navigation.replace('WelcomeAdmin'); // Go to welcome if not logged in
      }
    });
  }, [token, navigation]);

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ImageBackground
      source={require('../../../assets/img/Splashbackimg.png')}
      style={styles.background}
      resizeMode="cover" // make it cover entire screen
    >
      {/* Optional: remove overlay or make it very light */}
      <View style={styles.overlay} />

      <View style={styles.container}>
        {/* Logo */}
        <Image
          source={require('../../../assets/img/VostroLogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Tagline */}
        <Text style={styles.tagline}>
          HEALTH | FITNESS | WELLNESS
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              { width: widthInterpolated },
            ]}
          />
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.66)',
    // backgroundColor: '#191919CC',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  logo: {
    width: 220,
    height: 120,
    marginBottom: 20,
  },
  tagline: {
    color: '#A0A0A0',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 80,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 40,
    width: '70%',
    height: 4,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#E10600',
  },
});

export default Splash;
