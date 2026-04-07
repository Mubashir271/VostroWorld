import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

// import { navigationTheme } from './navigationTheme';
import BottomTabNavigation from '../BottomTabNavigation';
import DrawerContent from './Drawercontent';

const Drawer = createDrawerNavigator();

const DrawerNavigation = () => {
    return (
        // <NavigationContainer theme={navigationTheme}>
            <Drawer.Navigator
                drawerContent={(props) => <DrawerContent {...props} />}
                screenOptions={{
                    headerShown: false,
                    drawerStyle: {
                        width: '80%',
                        backgroundColor: '#fff',
                        borderTopRightRadius: 15,
                        borderBottomRightRadius: 15,
                    },
                }}
            >
                <Drawer.Screen name="Main" component={BottomTabNavigation} />
            </Drawer.Navigator>
        // </NavigationContainer>
    );
};

export default DrawerNavigation;