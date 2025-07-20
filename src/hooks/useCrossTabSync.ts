import { useEffect } from "react";

/**
 * Hook to handle cross-tab synchronization for logout events
 * Listens for storage changes and redirects to login if user is logged out in another tab
 */
export const useCrossTabSync = () => {
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Check if the change is to our work-os-storage key
      if (e.key === "work-os-storage" && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          // If another tab cleared the authentication (username is null/empty)
          if (!newState.state?.username) {
            // Force a page reload to redirect to login
            window.location.href = "/";
          }
        } catch (error) {
          console.error("Error parsing storage event:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);
};
