import React from 'react';
import { View, Text, TextInput, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { Error } from '../assets/icons';

interface TextInputWithLabelProps {
  label: string;
  icon?: ImageSourcePropType;
  iconColor?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
}

export const TextInputWithLabel: React.FC<TextInputWithLabelProps> = ({
  label,
  icon,
  iconColor = '#6B7280', 
  placeholder,
  value,
  onChangeText,
  error,
  keyboardType = 'default',
  secureTextEntry = false,
}) => (
  <View style={styles.container}>
    <View style={styles.labelRow}>
      {icon && <Image source={icon} style={[styles.icon, { tintColor: iconColor }]} />}
      <Text style={styles.label}>{label}</Text>
    </View>
    <TextInput
    //   style={[styles.input, error && { borderColor: 'red' }]}
    style={styles.input}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
    />
    {error ? 
    <View style={styles.errorRow}>
<Image source={Error} style={styles.icon}/>
        <Text style={styles.error}>{error}</Text> 
    </View>: null}
  </View>
);

const styles = StyleSheet.create({
  container: { marginBottom: 12, borderWidth:1, borderColor: '#00000029', backgroundColor:'#fff', borderRadius:10, padding: 10 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 6,
    resizeMode: 'contain',
  },
  label: { fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#0000003D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0000001A',
  },
  errorRow:{flexDirection:'row'},
  error: { color: 'red', marginTop: 4, fontSize: 10 },
});


// import React, { useState } from 'react';
// import { View, Text, TextInput, StyleSheet, Image, TouchableOpacity } from 'react-native';
// import { Error, Down, Eye, } from '../assets/icons';

// interface TextInputWithLabelProps {
//   label: string;
//   icon?: any;
//   iconColor?: string;
//   placeholder?: string;
//   value: string;
//   onChangeText: (text: string) => void;
//   error?: string;
//   keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
//   secureTextEntry?: boolean;
//   showPasswordStrength?: boolean;
//   strength?: 'None' | 'Weak' | 'Medium' | 'Strong';
//   dropdownOptions?: string[];
//   onSelectDropdown?: (option: string) => void;
//   selectedOption?: string;
// }

// export const TextInputWithLabel: React.FC<TextInputWithLabelProps> = ({
//   label,
//   icon,
//   iconColor = '#6B7280',
//   placeholder,
//   value,
//   onChangeText,
//   error,
//   keyboardType = 'default',
//   secureTextEntry = false,
//   showPasswordStrength = false,
//   strength,
//   dropdownOptions,
//   onSelectDropdown,
//   selectedOption,
// }) => {
//   const [hidePassword, setHidePassword] = useState(secureTextEntry);

//   return (
//     <View style={styles.container}>
//       <View style={styles.labelRow}>
//         {icon && <Image source={icon} style={[styles.icon, { tintColor: iconColor }]} />}
//         <Text style={styles.label}>{label}</Text>
//       </View>

//       {/* Dropdown scenario */}
//       {dropdownOptions ? (
//         <TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => {}}>
//           <Text>{selectedOption || 'Select an option'}</Text>
//           <Image source={Down} style={styles.icon} />
//         </TouchableOpacity>
//       ) : (
//         <>
//           {/* TextInput */}
//           <View style={{ position: 'relative' }}>
//             <TextInput
//               style={styles.input}
//               placeholder={placeholder}
//               value={value}
//               onChangeText={onChangeText}
//               keyboardType={keyboardType}
//               secureTextEntry={hidePassword}
//             />
//             {/* Eye icon for password */}
//             {secureTextEntry && (
//               <TouchableOpacity
//                 style={{ position: 'absolute', right: 12, top: 12 }}
//                 onPress={() => setHidePassword(!hidePassword)}
//               >
//                 <Image 
//                 // source={hidePassword ? Eye : EyeOff} 
//                 source={Eye}
//                 style={styles.icon} />
//               </TouchableOpacity>
//             )}
//           </View>

//           {/* Password strength */}
//           {showPasswordStrength && strength && (
//             <Text style={[styles.strength, strength === 'Strong' ? { color: 'green' } : strength === 'Medium' ? { color: 'orange' } : { color: 'red' }]}>
//               {strength}
//             </Text>
//           )}
//         </>
//       )}

//       {/* Error message */}
//       {error && (
//         <View style={styles.errorRow}>
//           <Image source={Error} style={styles.icon} />
//           <Text style={styles.error}>{error}</Text>
//         </View>
//       )}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { marginBottom: 12, borderWidth: 1, borderColor: '#00000029', backgroundColor: '#fff', borderRadius: 10, padding: 10 },
//   labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
//   icon: { width: 24, height: 24, marginRight: 6, resizeMode: 'contain' },
//   label: { fontWeight: '600', marginBottom: 4 },
//   input: { borderWidth: 1, borderColor: '#0000003D', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#0000001A' },
//   errorRow: { flexDirection: 'row', marginTop: 4 },
//   error: { color: 'red', fontSize: 10, marginLeft: 4 },
//   strength: { marginTop: 4, fontSize: 12, fontWeight: '600' },
// });
