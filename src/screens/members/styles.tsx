import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },

  list: { flex: 1 },

  header: { fontSize: 20, fontWeight: '700', marginBottom: 10 },

  searchBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    elevation: 1,
  },

  input: { marginLeft: 8, flex: 1 },

  filters: { flexDirection: 'row', marginBottom: 10 },

  filterItem: {
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 6,
  },

  filterText: { fontSize: 12 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  avatarText: { color: '#FFF', fontWeight: '700' },

  name: { fontWeight: '600' },

  info: { fontSize: 12, color: '#777' },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#D9D9D9',
  },

  packageBadge: {
    backgroundColor: '#E63946',
    paddingHorizontal: 8,
    borderRadius: 10,
  },

  packageText: { color: '#FFF', fontSize: 10 },

  actions: { flexDirection: 'row', gap: 6 },

  iconBtn: {
    backgroundColor: '#E63946',
    padding: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },

  loadMore: {
    borderWidth: 1,
    borderColor: '#E63946',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 10,
    backgroundColor: '#FEEEED',
    alignSelf: 'center',
    marginTop: 10,
  },

  loadMoreText: { color: '#E63946' },

  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#E63946',
    width: 55,
    height: 55,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sheetContent: { padding: 16 },

  sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },

  sheetLabel: { marginTop: 10, fontWeight: '600' },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  chip: {
    padding: 8,
    backgroundColor: '#EEE',
    borderRadius: 20,
  },

  applyBtn: {
    backgroundColor: '#E63946',
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  topBar: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
},

topTitle: {
  fontSize: 18,
  fontWeight: '700',
},

  filterScroll: {
    maxHeight: 48,
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 4,
  },

  filterChipText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
  },

reset: {
  color: '#E63946',
  fontSize: 12,
  fontWeight: '600',
  textAlign: 'right',
  paddingHorizontal: 16,
  paddingBottom: 6,
},
// Add these to your existing styles
optionItem: {
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#F0F0F0',
},
optionSelected: {
  backgroundColor: '#FFF5F5',
},
optionText: {
  fontSize: 16,
  color: '#333',
},
optionTextSelected: {
  fontSize: 16,
  color: '#E63946',
  fontWeight: '600',
},
});