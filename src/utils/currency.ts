// Backend amounts are always in PKR. Conversion rates come from a free,
// no-API-key exchange-rate service (base PKR) — see CurrencyRatesLoader.
export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
];

const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/PKR';

export interface CurrencyRates {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string;
}

export const fetchExchangeRates = async (): Promise<CurrencyRates> => {
  const res = await fetch(EXCHANGE_RATE_URL);
  const data = await res.json();
  if (data?.result !== 'success' || !data?.rates) {
    throw new Error('Failed to fetch exchange rates');
  }
  return { base: 'PKR', rates: data.rates, fetchedAt: new Date().toISOString() };
};

export const convertFromPKR = (
  amountPKR: number,
  currency: string,
  rates: Record<string, number> | null,
): number => {
  if (!currency || currency === 'PKR' || !rates) return amountPKR;
  const rate = rates[currency];
  return rate ? amountPKR * rate : amountPKR;
};

// Mirrors the old hardcoded `PKR ${amount.toLocaleString()}` formatting when
// currency is PKR / rates haven't loaded yet, so the default look is unchanged.
export const formatCurrency = (
  amountPKR: number | null | undefined,
  currency: string,
  rates: Record<string, number> | null,
): string => {
  const amount = Number(amountPKR) || 0;
  const converted = convertFromPKR(amount, currency, rates);
  const decimals = currency === 'PKR' || currency === 'JPY' ? 0 : 2;
  const formatted = converted.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${currency} ${formatted}`;
};
