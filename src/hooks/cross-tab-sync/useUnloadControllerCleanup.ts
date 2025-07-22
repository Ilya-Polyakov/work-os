import { useEffect } from "react";
import useWorkOSStore from "@/hooks/useWorkOSStore";

// Hook to clean up the loading controller state when this tab unloads or is closed.
// Ensures that if the current tab is the loading controller and is still loading,
// it releases control so other tabs can recover and continue the login process.
export const useUnloadControllerCleanup = (tabId: string) => {
  const { setLoadingController } = useWorkOSStore();

  useEffect(() => {
    const clearController = () => {
      const state = useWorkOSStore.getState();
      if (state.loadingController === tabId && state.isLoading) {
        setLoadingController(null);
        localStorage.setItem(
          "work-os-storage",
          JSON.stringify({
            state: { ...state, loadingController: null },
          })
        );
      }
    };

    window.addEventListener("beforeunload", clearController);
    window.addEventListener("pagehide", clearController);

    return () => {
      window.removeEventListener("beforeunload", clearController);
      window.removeEventListener("pagehide", clearController);
    };
  }, [tabId, setLoadingController]);
};
