// src/components/StaffNameCell.tsx
//
// A staff member's name inside a table that opens their Staff Profile — the
// staff counterpart of ClientNameCell, mirroring the web admin's links to
// /staff-profile/{id} in Staff Attendance and Employee Attendance.
//
// Plain <Text> with `onPress` (no wrapper View) so fixed-width table columns
// don't shift; non-interactive when there is no usable id.

import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';

type Props = {
  name?: string | null;
  staffId?: number | string | null;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  fallback?: string;
};

const StaffNameCell = ({ name, staffId, style, numberOfLines = 1, fallback = '—' }: Props) => {
  const navigation = useNavigation<any>();

  const label = (name ?? '').toString().trim() || fallback;
  const id = staffId == null ? null : Number(staffId);
  const canOpen = id !== null && Number.isFinite(id) && id > 0 && label !== fallback;

  return (
    <Text
      style={style}
      numberOfLines={numberOfLines}
      onPress={canOpen ? () => navigation.navigate('StaffProfile', { staffId: id }) : undefined}
      suppressHighlighting={!canOpen}
    >
      {label}
    </Text>
  );
};

export default React.memo(StaffNameCell);
