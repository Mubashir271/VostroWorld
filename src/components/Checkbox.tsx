import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from "react-native";

type CheckBoxProps = {
  checked: boolean;
  onChange: () => void;
  label?: string | React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  boxStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;

  // Customizable colors
  borderColor?: string;
  backgroundColor?: string;
  checkColor?: string;
};

const CheckBox: React.FC<CheckBoxProps> = ({
  checked,
  onChange,
  label,
  containerStyle,
  boxStyle,
  labelStyle,
  borderColor = "black",
  backgroundColor = "white",
  checkColor = "black",
}) => {
  return (
    <View style={styles.mainContainer}>
      <TouchableOpacity
        onPress={onChange}
        style={[styles.container, containerStyle]}
        activeOpacity={0.7}
      >
        {/* Box */}
        <View
          style={[
            styles.checkbox,
            { borderColor, backgroundColor },
            boxStyle,
          ]}
        >
          {checked && (
            <Text style={[styles.checkmark, { color: checkColor }]}>✓</Text>
          )}
        </View>

        {/* Optional Label */}
      </TouchableOpacity>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer:{
    flexDirection:'row',
    alignItems:'center',
    marginRight: 8
  },
  container: {
    // paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    // marginRight: 8,
  },
  checkmark: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  label: {
    fontSize: 14,
    color: "#333",
  },
});

export default CheckBox;
