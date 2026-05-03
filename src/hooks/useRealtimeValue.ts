import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { database } from '../config/firebase';

export function useRealtimeValue<T>(path: string | null) {
  const [value, setValue] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setValue(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onValue(
      ref(database, path),
      (snapshot) => {
        setValue((snapshot.val() ?? null) as T | null);
        setLoading(false);
        setError(null);
      },
      (firebaseError) => {
        setError(firebaseError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [path]);

  return { value, loading, error };
}
