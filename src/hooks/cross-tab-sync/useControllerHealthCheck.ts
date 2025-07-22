import { useEffect, useRef } from "react";
import useWorkOSStore from "@/hooks/useWorkOSStore";

export const useControllerHealthCheck = (tabId: string) => {
  const {
    isLoading,
    loadingController,
    setIsLoggedIn,
    setIsLoading,
    setLoadingProgress,
  } = useWorkOSStore();
  const lastProgressUpdate = useRef(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading && loadingController && loadingController !== tabId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      lastProgressUpdate.current = Date.now();

      intervalRef.current = setInterval(() => {
        const state = useWorkOSStore.getState();
        const timeSinceLast = Date.now() - lastProgressUpdate.current;

        const isControllerMissing = (() => {
          try {
            const raw = localStorage.getItem("work-os-storage");
            const storage = raw ? JSON.parse(raw) : null;
            return !storage?.state?.loadingController;
          } catch {
            return true;
          }
        })();

        if (
          timeSinceLast > 3000 &&
          state.isLoading &&
          !state.isLoggedIn &&
          state.username?.trim()
        ) {
          if (isControllerMissing || timeSinceLast > 6000) {
            clearInterval(intervalRef.current!);
            setLoadingProgress(100);
            setTimeout(() => {
              setIsLoggedIn(true);
              setIsLoading(false);
            }, 500);
          }
        }
      }, 3000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    isLoading,
    loadingController,
    tabId,
    setIsLoggedIn,
    setIsLoading,
    setLoadingProgress,
  ]);
};
