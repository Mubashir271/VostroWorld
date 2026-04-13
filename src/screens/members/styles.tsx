import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7', padding: 16 },

  header: { fontSize: 20, fontWeight: '700', marginBottom: 10 },

  searchBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center'
    // marginBottom: 10,
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
    marginBottom: 10,
    borderBottomWidth:1,
    gap: '10%',
    borderBottomColor: '#D9D9D9'
  },

  packageBadge: {
    backgroundColor: '#E63946',
    paddingHorizontal: 8,
    marginRight: 'auto',
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
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEEEED',
    paddingHorizontal: '15%',
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

  // New / Updated styles for fixed horizontal filters
  filterScroll: {
    // marginBottom: 8,           // space before "Reset Filters"
  },

  filterRow: {
    flexDirection: 'row',      // important: row + no wrap
    alignItems: 'center',
    paddingTop: 4,
    flexWrap: 'wrap'
    // No flexWrap here → prevents wrapping
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    marginRight: 10,           // spacing between chips
    minWidth: 110,             // prevents shrinking too much on long text
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },

  filterChipText: {
    fontSize: 13.5,
    color: '#444',
    fontWeight: '500',
  },

reset: {
  color: '#E63946',
  fontSize: 12,
  fontWeight: 'bold',
  textAlign: 'right',
  marginBottom: 10,
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