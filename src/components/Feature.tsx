import { Image, StyleSheet, Text, View } from "react-native";

export const Feature = ({ title, description, icon }: any) => (
    <View style={styles.feature}>
       <View style={styles.iconWrapper}>
      <Image source={icon} style={styles.icon} resizeMode="contain" />
    </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDescription}>{description}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderColor: '#00000029',
        borderWidth: 1,
    },
    iconWrapper: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    icon: {
    width: 40,  // adjust as needed
    height: 40, // adjust as needed
  },
    featureTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    featureDescription: {
        fontSize: 12,
        color: '#6B7280',
    },
})