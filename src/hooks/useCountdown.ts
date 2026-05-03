import { useEffect, useState } from 'react';

export function useCountdown(targetTime?: number | null) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, (targetTime ?? 0) - Date.now()));

  useEffect(() => {
    if (!targetTime) {
      setRemainingMs(0);
      return;
    }

    const tick = () => setRemainingMs(Math.max(0, targetTime - Date.now()));
    tick();
    const intervalId = window.setInterval(tick, 250);

    return () => window.clearInterval(intervalId);
  }, [targetTime]);

  return Math.ceil(remainingMs / 1000);
}
