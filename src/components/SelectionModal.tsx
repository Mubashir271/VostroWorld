import { Dimensions, FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Check } from "../assets/icons";

const width = Dimensions.get("screen");
export const SelectionModal = ({ visible, title, options, selectedValue, onSelect, onClose }: any) => (
  <Modal visible={visible} transparent animationType="slide">
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <View style={styles.handle} />
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedValue === item.label;
            return (
              <TouchableOpacity
                style={[styles.optionItem, isSelected && styles.selectedOption]}
                onPress={() => onSelect(item.label)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{item.label}</Text>
                  {item.subLabel && <Text style={styles.optionSubLabel}>{item.subLabel}</Text>}
                </View>
                {isSelected &&
                  // <Text style={{ color: 'red' }}>✓</Text>
                  <Image source={Check} style={styles.icon} />
                }
              </TouchableOpacity>
            );
          }}
        />
        <TouchableOpacity style={styles.confirmButton} onPress={onClose}>
          <Text style={styles.confirmButtonText}>Confirm Role</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#F5F5F5', maxHeight: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#fff', borderBottomColor: '#00000029', borderBottomWidth: 1 },
  handle: { width: 50, height: 4, backgroundColor: '#D9D9D9', borderRadius: 2, position: 'absolute', top: 10, left: '50%', },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', flex: 1 },
  optionItem: { marginHorizontal: 10, marginBottom: 12, padding: 16, borderWidth: 1, borderRadius: 10, borderColor: '#00000029', flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', },
  selectedOption: { backgroundColor: '#FEEEED', borderColor: '#FF7979' },
  optionLabel: { fontSize: 15, fontWeight: '500' },
  optionSubLabel: { fontSize: 12, color: '#6B7280' },
  confirmButton: { backgroundColor: '#E10600', borderRadius: 10, padding: 16, alignSelf:'center', width: '70%', alignItems:'center', marginBottom:10 },
  confirmButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  closeButton: {},
  icon: { width: 24, height: 24, resizeMode: 'contain' },
  // Radio Styles
  radioRow: { flexDirection: 'row', alignItems: 'center' },
  radioCircle: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#E5E7EB', marginRight: 6 },
  radioActive: { backgroundColor: '#D1D5DB' },
  radioText: { fontSize: 12, color: '#374151' }
})