// src/components/ClientNameCell.tsx
//
// A client name inside a report table that opens that client's profile, the
// way the web admin's report tables link their client column to
// /client-home/{client_id}.
//
// Renders a plain <Text> with an `onPress` rather than wrapping in a
// TouchableOpacity — the report tables lay their cells out with fixed pixel
// widths, and an extra View wrapper would shift the columns.
//
// Falls back to non-interactive text whenever there's no id to open: several
// report endpoints return a client name with no id (or a row that isn't a
// client at all, e.g. a staff attendance row), and a tap that silently does
// nothing is worse than one that was never offered.

import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';

type Props = {
  name?: string | null;
  clientId?: number | string | null;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  fallback?: string;
};

const ClientNameCell = ({ name, clientId, style, numberOfLines = 1, fallback = '—' }: Props) => {
  const navigation = useNavigation<any>();

  const label = (name ?? '').toString().trim() || fallback;

  // `0` and `"0"` are not real client ids here — treat them as absent.
  const id = clientId == null ? null : Number(clientId);
  const canOpen = id !== null && Number.isFinite(id) && id > 0 && label !== fallback;

  return (
    <Text
      style={style}
      numberOfLines={numberOfLines}
      onPress={canOpen ? () => navigation.navigate('ClientProfile', { clientId: id }) : undefined}
      suppressHighlighting={!canOpen}
    >
      {label}
    </Text>
  );
};

export default React.memo(ClientNameCell);
