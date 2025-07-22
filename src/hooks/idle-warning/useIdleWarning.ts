import { useEffect, useRef, useCallback } from "react";
import useWorkOSStore from "../useWorkOSStore";
import { useIdleTimers } from "./useIdleTimers";
import { createStorageHandler } from "./createStorageHandler";

export const useIdleWarning = () => {
  const {
    isLoggedIn,
    idleWarningCount,
    isIdleWarningActive,
    isUserActive,
    setIdleWarningCount,
    setIsIdleWarningActive,
    setIsUserActive,
    setLastActivityTime,
    setModalIsOpen,
    setRequestingTabId,
    setIsLoggedOutFromIdle,
  } = useWorkOSStore();

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCountingDownRef = useRef(false);

  const { startCountdown, resetIdleTimer } = useIdleTimers({
    idleTimerRef,
    countdownTimerRef,
    isCountingDownRef,
  });

  // Activity detection
  const handleActivity = useCallback(() => {
    if (!isLoggedIn) return;
    if (useWorkOSStore.getState().isLoggedOutFromIdle) return;
    const now = Date.now();
    setLastActivityTime(now);
    localStorage.setItem(
      "idle-activity-detected",
      JSON.stringify({
        timestamp: now,
        tabId: Math.random().toString(36).substr(2, 9),
      })
    );
    if (isIdleWarningActive && !isUserActive) {
      setIsUserActive(true);
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      isCountingDownRef.current = false;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      resetIdleTimer();
      return;
    }
    if (isIdleWarningActive && isUserActive && !isCountingDownRef.current) {
      resetIdleTimer();
      return;
    }
    if (!isIdleWarningActive && isUserActive) {
      resetIdleTimer();
      return;
    }
    if (!isIdleWarningActive) {
      resetIdleTimer();
    }
  }, [
    isLoggedIn,
    isIdleWarningActive,
    isUserActive,
    setLastActivityTime,
    setIsUserActive,
    resetIdleTimer,
  ]);

  useEffect(() => {
    const handler = createStorageHandler({
      isCountingDownRef,
      countdownTimerRef,
      resetIdleTimer,
      startCountdown,
      setIdleWarningCount,
      setIsIdleWarningActive,
      setIsUserActive,
      setModalIsOpen,
      setLastActivityTime,
      setIsLoggedOutFromIdle,
      setRequestingTabId,
      idleWarningCount,
      isIdleWarningActive,
      isUserActive,
      isLoggedIn,
    });

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [
    resetIdleTimer,
    startCountdown,
    setIsUserActive,
    setIdleWarningCount,
    setIsIdleWarningActive,
    setModalIsOpen,
    idleWarningCount,
    isIdleWarningActive,
    isUserActive,
    isLoggedIn,
    setLastActivityTime,
    setIsLoggedOutFromIdle,
    setRequestingTabId,
  ]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const events = ["keydown", "click", "mousemove"];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });
    resetIdleTimer();
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [isLoggedIn, handleActivity, resetIdleTimer]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const currentState = useWorkOSStore.getState();
    if (
      !currentState.isIdleWarningActive &&
      !currentState.isLoggedOutFromIdle
    ) {
      const requestingTabId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem(
        "idle-state-request",
        JSON.stringify({
          timestamp: Date.now(),
          requestingTabId: requestingTabId,
        })
      );
      setRequestingTabId(requestingTabId);
    }
    if (currentState.isIdleWarningActive) {
      setModalIsOpen(true);
      if (!currentState.isUserActive) {
        startCountdown();
      } else if (currentState.isUserActive) {
        resetIdleTimer();
      }
    }
  }, [
    isLoggedIn,
    isIdleWarningActive,
    isUserActive,
    idleWarningCount,
    setModalIsOpen,
    setRequestingTabId,
    startCountdown,
    resetIdleTimer,
  ]);

  useEffect(() => {
    if (!isLoggedIn) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }
  }, [isLoggedIn]);

  const handleModalDismissal = useCallback(() => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    isCountingDownRef.current = false;
    const newWarningCount = idleWarningCount + 1;
    setIdleWarningCount(newWarningCount);
    setIsUserActive(false);
    setIsIdleWarningActive(false);
    setModalIsOpen(false);
    localStorage.setItem(
      "idle-modal-dismissed",
      JSON.stringify({
        warningCount: newWarningCount,
        timestamp: Date.now(),
        tabId: Math.random().toString(36).substr(2, 9),
      })
    );
    resetIdleTimer();
  }, [
    idleWarningCount,
    setIdleWarningCount,
    setIsUserActive,
    setIsIdleWarningActive,
    setModalIsOpen,
    resetIdleTimer,
  ]);

  return {
    handleActivity,
    resetIdleTimer,
    handleModalDismissal,
  };
};
