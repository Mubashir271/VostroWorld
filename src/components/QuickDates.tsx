// src/components/QuickDates.tsx
//
// The "Quick Dates" block the web admin puts above several reports — three
// groups of four buttons that set the date range.
//
// The ranges come from the server (GET /v1/get-dates/<key>), not from local
// date maths: see `getQuickDates` in api/reports.ts for why reimplementing
// them here would silently disagree with the web.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getQuickDates } from '../api/reports';

// HAR-confirmed 2026-09-07: `lastQuarter` → 2025-10-01..2025-12-31,
// `lastMonth` → 2026-08-01..2026-08-31, and Yesterday is `lastDay`
// → 2026-09-06..2026-09-06 (NOT `yesterday`, which was the first guess).
// The `last<Unit>` shape makes `lastYear` near-certain; the To-Date and
// Previous keys are still inferred. An unknown key surfaces the error below
// rather than falling back to a locally computed range, which would look like
// it worked while returning different dates.
const GROUPS: { title: string; items: { label: string; key: string }[] }[] = [
  {
    title: 'Last',
    items: [
      { label: 'Year', key: 'lastYear' },
      { label: 'Quarter', key: 'lastQuarter' },
      { label: 'Month', key: 'lastMonth' },
      { label: 'Yesterday', key: 'lastDay' },
    ],
  },
  {
    title: 'To-Date',
    items: [
      { label: 'Year', key: 'yearToDate' },
      { label: 'Quarter', key: 'quarterToDate' },
      { label: 'Month', key: 'monthToDate' },
      { label: 'Today', key: 'today' },
    ],
  },
  {
    title: 'Previous',
    items: [
      { label: '365 Days', key: 'previous365Days' },
      { label: '90 Days', key: 'previous90Days' },
      { label: '30 Days', key: 'previous30Days' },
      { label: '9 Days', key: 'previous9Days' },
    ],
  },
];

type Props = {
  onRange: (start: string, end: string) => void;
  disabled?: boolean;
};

const QuickDates = ({ onRange, disabled }: Props) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const press = async (key: string, label: string) => {
    setBusy(key);
    setFailed(null);
    try {
      const range = await getQuickDates(key);
      if (range) onRange(range.StartDate, range.EndDate);
      else setFailed(`"${label}" returned no range.`);
    } catch {
      setFailed(`"${label}" isn't available on the server (key "${key}").`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View>
      {GROUPS.map(g => (
        <View key={g.title} style={s.group}>
          <Text style={s.title}>{g.title}</Text>
          <View style={s.row}>
            {g.items.map(it => (
              <TouchableOpacity
                key={it.key}
                style={[s.chip, (disabled || busy === it.key) && s.chipBusy]}
                disabled={disabled || busy !== null}
                onPress={() => press(it.key, it.label)}
              >
                {busy === it.key
                  ? <ActivityIndicator size="small" color="#555" />
                  : <Text style={s.chipText}>{it.label}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      {failed && <Text style={s.error}>{failed}</Text>}
    </View>
  );
};

const s = StyleSheet.create({
  group:     { marginBottom: 8 },
  title:     { fontSize: 11, color: '#888', marginBottom: 4 },
  row:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:      { minWidth: 70, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#F0F0F0', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipBusy:  { opacity: 0.6 },
  chipText:  { fontSize: 12, color: '#444', fontWeight: '500' },
  error:     { fontSize: 11, color: '#B45309', marginTop: 2, marginBottom: 4 },
});

export default QuickDates;
