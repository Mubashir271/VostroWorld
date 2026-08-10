import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store';
import { setCurrencyRates } from './slices/userSlice';
import { fetchExchangeRates } from '../utils/currency';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Refreshes cached exchange rates on app start when stale (>24h old or
// never fetched). Silently keeps the last cached rates on failure (e.g.
// offline) — formatCurrency() falls back to unconverted PKR if none exist.
const CurrencyRatesLoader = () => {
  const dispatch = useDispatch();
  const fetchedAt = useSelector((state: RootState) => state.user.currencyRates?.fetchedAt);

  useEffect(() => {
    const isStale = !fetchedAt || Date.now() - new Date(fetchedAt).getTime() > ONE_DAY_MS;
    if (!isStale) return;

    fetchExchangeRates()
      .then((rates) => dispatch(setCurrencyRates(rates)))
      .catch((err) => console.log('Exchange rate fetch failed:', err));
  }, [fetchedAt, dispatch]);

  return null;
};

export default CurrencyRatesLoader;
