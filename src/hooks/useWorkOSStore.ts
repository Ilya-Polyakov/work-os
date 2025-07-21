import { create } from "zustand";
import { persist } from "zustand/middleware";

// Add debounce tracking for resetStore
let lastResetTime = 0;
let isLoggingOut = false; // Flag to prevent multiple logout attempts

interface WorkOSStore {
  username: string;
  setUsername: (username: string) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  loadingProgress: number;
  setLoadingProgress: (progress: number) => void;
  loadingController: string | null; // Tab ID that controls loading
  setLoadingController: (controllerId: string | null) => void;
  totalClicks: number;
  incrementClicks: () => void;
  resetClicks: () => void;
  modalIsOpen: boolean;
  setModalIsOpen: (isOpen: boolean) => void;

  // Idle Warning System
  idleWarningCount: number; // 0-3 (0 = no warnings yet, 3 = final warning given)
  idleCountdown: number; // 10-0 seconds remaining
  isIdleWarningActive: boolean;
  isUserActive: boolean; // true when user becomes active during warning
  lastActivityTime: number; // timestamp
  isLoggedOutFromIdle: boolean; // true when showing "logged out" modal
  requestingTabId: string | null; // ID of tab that made idle state request

  setIdleWarningCount: (count: number) => void;
  setIdleCountdown: (countdown: number) => void;
  decrementIdleCountdown: () => number; // Returns new countdown value
  setIsIdleWarningActive: (active: boolean) => void;
  setIsUserActive: (active: boolean) => void;
  setLastActivityTime: (time: number) => void;
  setIsLoggedOutFromIdle: (loggedOut: boolean) => void;
  setRequestingTabId: (tabId: string | null) => void;
  resetIdleWarningSystem: () => void;

  resetStore: () => void;
  clearLogoutFlag: () => void; // Add function to clear the logout flag
}

const useWorkOSStore = create<WorkOSStore>()(
  persist(
    (set) => ({
      username: "",
      setUsername: (username: string) => set({ username }),
      isLoggedIn: false,
      setIsLoggedIn: (isLoggedIn: boolean) => {
        if (isLoggedIn) {
          isLoggingOut = false; // Reset logout flag on successful login
        }
        set({ isLoggedIn });
      },
      isLoading: false,
      setIsLoading: (isLoading: boolean) => set({ isLoading }),
      loadingProgress: 0,
      setLoadingProgress: (progress: number) =>
        set({ loadingProgress: progress }),
      loadingController: null,
      setLoadingController: (controllerId: string | null) =>
        set({ loadingController: controllerId }),
      totalClicks: 0,
      incrementClicks: () =>
        set((state) => ({
          totalClicks: state.totalClicks + 1,
        })),
      resetClicks: () => set({ totalClicks: 0 }),
      modalIsOpen: false,
      setModalIsOpen: (isOpen: boolean) => set({ modalIsOpen: isOpen }),

      // Idle Warning System
      idleWarningCount: 0,
      idleCountdown: 10,
      isIdleWarningActive: false,
      isUserActive: false,
      lastActivityTime: Date.now(),
      isLoggedOutFromIdle: false,
      requestingTabId: null,

      setIdleWarningCount: (count: number) => set({ idleWarningCount: count }),
      setIdleCountdown: (countdown: number) =>
        set({ idleCountdown: countdown }),
      decrementIdleCountdown: () => {
        let newCountdown = 0;
        set((state) => {
          newCountdown = state.idleCountdown - 1;
          return { idleCountdown: newCountdown };
        });
        return newCountdown;
      },
      setIsIdleWarningActive: (active: boolean) =>
        set({ isIdleWarningActive: active }),
      setIsUserActive: (active: boolean) => set({ isUserActive: active }),
      setLastActivityTime: (time: number) => set({ lastActivityTime: time }),
      setIsLoggedOutFromIdle: (loggedOut: boolean) =>
        set({ isLoggedOutFromIdle: loggedOut }),
      setRequestingTabId: (tabId: string | null) =>
        set({ requestingTabId: tabId }),

      resetIdleWarningSystem: () =>
        set({
          idleWarningCount: 0,
          idleCountdown: 10,
          isIdleWarningActive: false,
          isUserActive: false,
          lastActivityTime: Date.now(),
          isLoggedOutFromIdle: false,
          requestingTabId: null,
        }),

      resetStore: () => {
        const now = Date.now();

        // Prevent multiple logout attempts
        if (isLoggingOut) {
          return;
        }

        // Debounce: prevent multiple rapid calls within 1 second
        if (now - lastResetTime < 1000) {
          return;
        }

        lastResetTime = now;
        isLoggingOut = true;

        // Broadcast logout to other tabs before resetting store
        localStorage.setItem(
          "user-logout",
          JSON.stringify({
            timestamp: Date.now(),
            tabId: Math.random().toString(36).substr(2, 9),
          })
        );

        const resetState = {
          isLoggedIn: false,
          username: "",
          isLoading: false,
          loadingProgress: 0,
          loadingController: null,
          modalIsOpen: false,
          // Reset idle warning system on logout
          idleWarningCount: 0,
          idleCountdown: 10,
          isIdleWarningActive: false,
          isUserActive: false,
          lastActivityTime: Date.now(),
          isLoggedOutFromIdle: false,
        };

        set(resetState);

        // Force a manual update to the persistent storage to ensure it's saved
        setTimeout(() => {
          // Double-check and force update if needed
          const currentState = useWorkOSStore.getState();

          // If username is still not empty, force clear it
          if (currentState.username !== "") {
            set({
              username: "",
              isLoggedIn: false,
              isLoggedOutFromIdle: false,
            });
          }
        }, 50);
      },

      clearLogoutFlag: () => {
        isLoggingOut = false;
      },
    }),
    {
      name: "work-os-storage",
    }
  )
);

export default useWorkOSStore;
