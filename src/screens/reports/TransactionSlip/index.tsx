import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { getTransactionSlip } from '../../../api/reports';

const TransactionSlipScreen = () => {
  const [slip, setSlip] = useState<any>(null);

  const loadSlip = async () => {
    const res = await getTransactionSlip(101);
    setSlip(res.data);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button title="Load Slip" onPress={loadSlip} />

      {slip && (
        <Text>{JSON.stringify(slip, null, 2)}</Text>
      )}
    </View>
  );
};

export default TransactionSlipScreen;