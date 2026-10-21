import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { type ISODate, toLocalISODate } from '@saddahaq/shared';

/** The phone's local date; refreshed when the app comes back to the foreground. */
export function useToday(): ISODate {
  const [today, setToday] = useState(() => toLocalISODate(new Date()));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => {
      if (status === 'active') {
        setToday(toLocalISODate(new Date()));
      }
    });
    return () => subscription.remove();
  }, []);
  return today;
}
