// components/AppHeader.tsx

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AppHeaderProps {
    title: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onLeftPress?: () => void;
    onRightPress?: () => void;
    backgroundColor?: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({
    title,
    leftIcon,
    rightIcon,
    onLeftPress,
    onRightPress,
    backgroundColor = '#ffffff',
}) => {
    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
            <View style={styles.container}>
                {/* Left */}
                <View style={styles.sideContainer}>
                    {leftIcon && (
                        <TouchableOpacity onPress={onLeftPress}>
                            {leftIcon}
                        </TouchableOpacity>
                    )}

                </View>

                {/* Center Title */}
                <View style={styles.centerContainer}>
                    <Text style={styles.title}>{title}</Text>
                </View>

                {/* Right */}
                <View style={[styles.sideContainer, { alignItems: 'flex-end' }]}>
                    {rightIcon && (
                        <TouchableOpacity onPress={onRightPress}>
                            {rightIcon}  {/* render component directly */}
                        </TouchableOpacity>
                    )}
                </View>

            </View>
        </SafeAreaView>
    );
};

export default AppHeader;

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#fff',
    },
    container: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    sideContainer: {
        width: 60, // keeps title perfectly centered
        justifyContent: 'center',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    icon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
});
