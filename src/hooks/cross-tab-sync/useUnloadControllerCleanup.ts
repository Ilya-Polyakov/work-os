import { useEffect } from "react";
import useWorkOSStore from "@/hooks/useWorkOSStore";

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
