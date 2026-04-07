// src/utils/navigationActions.ts
import { CommonActions, NavigationProp } from '@react-navigation/native';

/**
 * Resets the navigation stack and goes to Login screen
 */
export const resetToLogin = (navigation: NavigationProp<any>) => {
    navigation.dispatch(
        CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' as never }],
        })
    );
};
