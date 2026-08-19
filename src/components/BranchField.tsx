import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView,
  StyleProp, ViewStyle, TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BranchOption } from '../hooks/useBranchSelector';

interface Props {
  /** True when the signed-in user has no branch of their own (super admin). */
  needsPicker: boolean;
  /** Branch name to display; empty string renders the placeholder. */
  branchName: string;
  options: BranchOption[];
  loadingOptions?: boolean;
  onSelect: (opt: BranchOption) => void;
  /** Node, not just a string — several screens mark the asterisk up separately. */
  label?: React.ReactNode;
  /**
   * Some read-only boxes already draw a chevron to look like a dropdown. Keep
   * drawing it so the field is unchanged for users who cannot pick a branch.
   */
  staticChevron?: boolean;
  /**
   * Host-screen styles. Screens differ in label spacing and control padding,
   * so each passes its own to keep this field pixel-identical to the ones
   * beside it — the read-only path in particular must render exactly what the
   * screen rendered before. Defaults match the common HR/Finance idiom.
   */
  labelStyle?: StyleProp<TextStyle>;
  staticStyle?: StyleProp<ViewStyle>;
  staticTextStyle?: StyleProp<TextStyle>;
  pickerStyle?: StyleProp<ViewStyle>;
  pickerTextStyle?: StyleProp<TextStyle>;
  placeholderStyle?: StyleProp<TextStyle>;
}

/**
 * "Branch Name*" form field. Mirrors the web admin, which renders a required
 * branch dropdown on these screens; branch-scoped users keep their own branch
 * read-only, super admin picks from the live branch list.
 */
const BranchField: React.FC<Props> = ({
  needsPicker,
  branchName,
  options,
  loadingOptions,
  onSelect,
  label = 'Branch Name*',
  staticChevron,
  labelStyle,
  staticStyle,
  staticTextStyle,
  pickerStyle,
  pickerTextStyle,
  placeholderStyle,
}) => {
  const [visible, setVisible] = useState(false);

  if (!needsPicker) {
    return (
      <>
        <Text style={labelStyle ?? styles.label}>{label}</Text>
        <View style={staticStyle ?? styles.staticInput}>
          <Text style={staticTextStyle ?? styles.staticText}>{branchName}</Text>
          {staticChevron && <Icon name="chevron-down" size={18} color="#aaa" />}
        </View>
      </>
    );
  }

  return (
    <>
      <Text style={labelStyle ?? styles.label}>{label}</Text>
      <TouchableOpacity style={pickerStyle ?? styles.picker} onPress={() => setVisible(true)}>
        <Text
          style={branchName
            ? (pickerTextStyle ?? styles.pickerText)
            : (placeholderStyle ?? styles.placeholder)}
          numberOfLines={1}>
          {branchName || 'Select Branches'}
        </Text>
        <Icon name="chevron-down" size={16} color="#666" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Branches</Text>
            <ScrollView>
              {options.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={styles.dropdownItem}
                  onPress={() => { onSelect(b); setVisible(false); }}>
                  <Text style={[
                    styles.dropdownItemText,
                    branchName === b.name && styles.dropdownItemActive,
                  ]}>
                    {b.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {options.length === 0 && (
                <Text style={styles.emptyText}>
                  {loadingOptions ? 'Loading branches…' : 'No branches found.'}
                </Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default BranchField;

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  staticInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: '#F0F0F0',
  },
  staticText: { fontSize: 13, color: '#444' },
  // Same border/radius/padding as staticInput so swapping one for the other
  // does not change the field's height or the row it sits in.
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: '#FAFAFA', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  dropdownItemActive: { color: '#C62828', fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },
});
