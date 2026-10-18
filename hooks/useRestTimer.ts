import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

export interface RestTimerState {
  exerciseName: string;
  totalSeconds: number;
  secondsLeft: number;
}

const ADJUST_STEP = 15;
const BEEP_WINDOW_SECONDS = 5;
const TICK_MS = 250;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function secondsLeftFromEndAt(endAt: number): number {
  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}

export function useRestTimer() {
  const [timer, setTimer] = useState<RestTimerState | null>(null);
  const endAtRef = useRef<number | null>(null);
  const lastAnnouncedSecondRef = useRef<number | null>(null);
  const notificationIdRef = useRef<string | null>(null);

  const beepPlayer = useAudioPlayer(require("../assets/sounds/beep.wav"));
  const dingPlayer = useAudioPlayer(require("../assets/sounds/ding.wav"));

  const cancelScheduledNotification = useCallback(() => {
    const id = notificationIdRef.current;
    notificationIdRef.current = null;
    if (id) {
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
  }, []);

  const scheduleCompletionNotification = useCallback(async (endAt: number, exerciseName: string) => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      if (requested.status !== "granted") return;
    }
    const secondsFromNow = Math.max(1, Math.round((endAt - Date.now()) / 1000));
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Rest complete",
        body: `${exerciseName} — time for your next set`,
        sound: "ding.wav",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsFromNow,
      },
    });
    notificationIdRef.current = id;
  }, []);

  const finish = useCallback(() => {
    endAtRef.current = null;
    lastAnnouncedSecondRef.current = null;
    cancelScheduledNotification();
    dingPlayer.seekTo(0);
    dingPlayer.play();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimer(null);
  }, [cancelScheduledNotification, dingPlayer]);

  const tick = useCallback(() => {
    const endAt = endAtRef.current;
    if (endAt === null) return;
    const secondsLeft = secondsLeftFromEndAt(endAt);

    if (secondsLeft <= 0) {
      finish();
      return;
    }

    if (secondsLeft <= BEEP_WINDOW_SECONDS && lastAnnouncedSecondRef.current !== secondsLeft) {
      lastAnnouncedSecondRef.current = secondsLeft;
      beepPlayer.seekTo(0);
      beepPlayer.play();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    setTimer((current) => (current ? { ...current, secondsLeft } : current));
  }, [beepPlayer, finish]);

  useEffect(() => {
    if (!timer) return;

    const interval = setInterval(tick, TICK_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [timer !== null, tick]);

  const start = useCallback(
    (totalSeconds: number, exerciseName: string) => {
      cancelScheduledNotification();
      const endAt = Date.now() + totalSeconds * 1000;
      endAtRef.current = endAt;
      lastAnnouncedSecondRef.current = null;
      setTimer({ exerciseName, totalSeconds, secondsLeft: totalSeconds });
      scheduleCompletionNotification(endAt, exerciseName);
    },
    [cancelScheduledNotification, scheduleCompletionNotification]
  );

  const adjust = useCallback(
    (deltaSeconds: number) => {
      setTimer((current) => {
        if (!current || endAtRef.current === null) return current;
        const newEndAt = endAtRef.current + deltaSeconds * 1000;
        const secondsLeft = secondsLeftFromEndAt(newEndAt);
        if (secondsLeft <= 0) {
          cancelScheduledNotification();
          endAtRef.current = null;
          return null;
        }
        endAtRef.current = newEndAt;
        lastAnnouncedSecondRef.current = null;
        cancelScheduledNotification();
        scheduleCompletionNotification(newEndAt, current.exerciseName);
        return { ...current, secondsLeft, totalSeconds: Math.max(current.totalSeconds, secondsLeft) };
      });
    },
    [cancelScheduledNotification, scheduleCompletionNotification]
  );

  const dismiss = useCallback(() => {
    endAtRef.current = null;
    lastAnnouncedSecondRef.current = null;
    cancelScheduledNotification();
    setTimer(null);
  }, [cancelScheduledNotification]);

  return { timer, start, adjust, dismiss, adjustStep: ADJUST_STEP };
}
