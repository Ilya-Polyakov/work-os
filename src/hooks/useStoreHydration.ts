import { useEffect, useState } from "react";
import useWorkOSStore from "./useWorkOSStore";

/**
 * Hook to check if the Zustand store has been hydrated from localStorage
 * This prevents flickering between login/work screens on page refresh
 */
export const useStoreHydration = () => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check if we're on the client side and wait for hydration
    const unsubscribe = useWorkOSStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    // If hydration has already finished, set immediately
    if (useWorkOSStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return unsubscribe;
  }, []);

  return isHydrated;
};
