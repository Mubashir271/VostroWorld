import React, { useEffect, useRef } from 'react';
import { Text, Animated, StyleSheet, Keyboard } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { hideSnackbar } from './slices/snackbarSlice';
import { RootState } from './store';

const GlobalSnackbar = () => {
  const dispatch = useDispatch();
  const { visible, message, type } = useSelector((state: RootState) => state.snackbar);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          dispatch(hideSnackbar());
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  useEffect(() => {
    const keyboardDidShow = (e: any) => {
      const keyboardHeight = e.endCoordinates?.height || 100;
      Animated.timing(translateY, { toValue: -keyboardHeight - 20, duration: 250, useNativeDriver: true }).start();
    };
    const keyboardDidHide = () => {
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    };
    const showListener = Keyboard.addListener('keyboardDidShow', keyboardDidShow);
    const hideListener = Keyboard.addListener('keyboardDidHide', keyboardDidHide);
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  if (!visible) return null;

  const backgroundColor = type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#5d5252ff';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY }], backgroundColor }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

export default GlobalSnackbar;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 8,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
