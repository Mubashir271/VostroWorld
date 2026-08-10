import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { formatCurrency } from '../utils/currency';

// Formats a PKR amount from the backend into the app's selected currency.
export const useCurrencyFormatter = () => {
  const currency = useSelector((state: RootState) => state.user.currency);
  const rates = useSelector((state: RootState) => state.user.currencyRates?.rates ?? null);

  return useCallback(
    (amountPKR: number | null | undefined) => formatCurrency(amountPKR, currency, rates),
    [currency, rates],
  );
};
