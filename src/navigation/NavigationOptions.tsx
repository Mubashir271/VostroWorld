import React from 'react';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const defaultStackOptions = {
  headerStyle: {
    backgroundColor: '#FFE5E5',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTintColor: '#1A1A1A',
  headerTitleStyle: {
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    fontSize: 18,
  },
  headerBackTitleVisible: false,
  headerShown: false,
};

export const getHeaderWithMenu = (navigation: any) => ({
  headerLeft: () => (
    <TouchableOpacity
      onPress={() => navigation.openDrawer()}
      style={{ marginLeft: 16 }}
    >
      <Icon name="menu" size={28} color="#1A1A1A" />
    </TouchableOpacity>
  ),
  headerRight: () => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Notifications')}
      style={{ marginRight: 16 }}
    >
      <Icon name="bell-outline" size={24} color="#1A1A1A" />
    </TouchableOpacity>
  ),
});

export const getHeaderWithBack = (navigation: any, title: string) => ({
  title,
  headerLeft: () => (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={{ marginLeft: 16 }}
    >
      <Icon name="arrow-left" size={24} color="#1A1A1A" />
    </TouchableOpacity>
  ),
});
