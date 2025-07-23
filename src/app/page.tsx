"use client";

import { useEffect } from "react";

import useWorkOSStore from "@/hooks/useWorkOSStore";
import { useStoreHydration } from "@/hooks/useStoreHydration";
import { IDLE_TIMEOUT, COUNTDOWN_DURATION } from "@/constants/timing";
import Login from "@/features/Login/Login";
import Work from "@/features/Work/Work";
import WarningWindow from "@/features/Warning/WarningWindow";

export default function Home() {
  const {
    isLoggedIn,
    lastActivityTime,
    resetStore,
    modalIsOpen,
    setModalIsOpen,
  } = useWorkOSStore();
  const isHydrated = useStoreHydration();

  useEffect(() => {
    if (
      isHydrated &&
      isLoggedIn &&
      typeof lastActivityTime === "number" &&
      lastActivityTime > 0
    ) {
      const now = Date.now();
      if (now - lastActivityTime > IDLE_TIMEOUT + COUNTDOWN_DURATION * 1000) {
        resetStore();
      }
    }
  }, [isHydrated, isLoggedIn, lastActivityTime, resetStore]);

  if (!isHydrated) {
    return;
  }

  return (
    <main className="relative h-screen w-screen">
      {isLoggedIn ? <Work /> : <Login />}
      <WarningWindow
        isOpen={modalIsOpen}
        onClose={() => setModalIsOpen(false)}
      />
    </main>
  );
}
