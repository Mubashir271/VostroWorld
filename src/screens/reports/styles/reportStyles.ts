import { StyleSheet } from 'react-native';

export const reportStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    padding: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },

  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
  },

  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  label: {
    fontSize: 13,
    color: '#6B7280',
  },

  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignSelf: 'flex-start',
  },

  badgeText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
  },

  section: {
    marginBottom: 16,
  },
   // ── Empty State ──────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});