import { useCallback, useRef, useEffect } from "react";
import useWorkOSStore from "@/hooks/useWorkOSStore";

export const useSimulateLoading = (tabId: string) => {
  const { setLoadingProgress, setLoadingController } = useWorkOSStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (duration: number, onComplete: () => void) => {
      let currentProgress = 0;
      const startTime = Date.now();

      const updateProgress = () => {
        const state = useWorkOSStore.getState();
        if (state.loadingController !== tabId) return;

        const elapsed = Date.now() - startTime;

        if (elapsed >= duration) {
          setLoadingProgress(100);

          localStorage.setItem(
            "work-os-storage",
            JSON.stringify({
              state: {
                ...state,
                isLoggedIn: true,
                isLoading: false,
                loadingController: null,
                loadingProgress: 100,
              },
            })
          );

          timeoutRef.current = setTimeout(() => {
            onComplete();
            setLoadingController(null);
          }, 1000);

          return;
        }

        const randomIncrement = Math.random() * 7 + 1;
        const maxProgress = (elapsed / duration) * 85;
        const newProgress = Math.min(
          currentProgress + randomIncrement,
          maxProgress,
          95
        );

        currentProgress = newProgress;
        setLoadingProgress(Math.floor(currentProgress));

        const delay = Math.random() * 700 + 100;
        timeoutRef.current = setTimeout(updateProgress, delay);
      };

      updateProgress();
    },
    [tabId, setLoadingProgress, setLoadingController]
  );
};
