import { useCallback, useEffect, useRef, useState } from "react";

export interface RestTimerState {
  exerciseName: string;
  totalSeconds: number;
  secondsLeft: number;
}

const MIN_SECONDS = 5;
const ADJUST_STEP = 15;

export function useRestTimer() {
  const [timer, setTimer] = useState<RestTimerState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!timer || timer.secondsLeft <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimer((current) => {
        if (!current) {
          return current;
        }
        if (current.secondsLeft <= 1) {
          return null;
        }
        return { ...current, secondsLeft: current.secondsLeft - 1 };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer !== null]);

  const start = useCallback((totalSeconds: number, exerciseName: string) => {
    setTimer({ exerciseName, totalSeconds, secondsLeft: totalSeconds });
  }, []);

  const adjust = useCallback((deltaSeconds: number) => {
    setTimer((current) => {
      if (!current) {
        return current;
      }
      const secondsLeft = Math.max(MIN_SECONDS, current.secondsLeft + deltaSeconds);
      return { ...current, secondsLeft, totalSeconds: Math.max(current.totalSeconds, secondsLeft) };
    });
  }, []);

  const dismiss = useCallback(() => {
    setTimer(null);
  }, []);

  return { timer, start, adjust, dismiss, adjustStep: ADJUST_STEP };
}
