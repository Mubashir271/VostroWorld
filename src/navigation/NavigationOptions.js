import React from 'react';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Default stack navigator options
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
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 18,
  },
  headerBackTitleVisible: false,
};

// Header with menu button
export const getHeaderWithMenu = (navigation) => ({
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

// Header with back button
export const getHeaderWithBack = (navigation, title) => ({
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

export const getCenteredHeader = (navigation, title: string) => ({
  headerTitle: () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}
    >
      {/* Left Image */}
      <TouchableOpacity
        onPress={() => navigation.openDrawer()}
        style={{ paddingHorizontal: 16 }}
      >
        <Icon name="menu" size={26} color="#1A1A1A" />
        {/* Or use Image instead */}
        {/* <Image source={require('../assets/menu.png')} style={{ width: 24, height: 24 }} /> */}
      </TouchableOpacity>

      {/* Center Title */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#1A1A1A',
        }}
      >
        {title}
      </Text>

      {/* Right Image */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Notifications')}
        style={{ paddingHorizontal: 16 }}
      >
        <Icon name="bell-outline" size={24} color="#1A1A1A" />
        {/* Or Image */}
        {/* <Image source={require('../assets/bell.png')} style={{ width: 24, height: 24 }} /> */}
      </TouchableOpacity>
    </View>
  ),
});