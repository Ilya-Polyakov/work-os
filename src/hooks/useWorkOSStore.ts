import { create } from "zustand";
import { persist } from "zustand/middleware";

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

  setIdleWarningCount: (count: number) => void;
  setIdleCountdown: (countdown: number) => void;
  decrementIdleCountdown: () => number; // Returns new countdown value
  setIsIdleWarningActive: (active: boolean) => void;
  setIsUserActive: (active: boolean) => void;
  setLastActivityTime: (time: number) => void;
  setIsLoggedOutFromIdle: (loggedOut: boolean) => void;
  resetIdleWarningSystem: () => void;

  resetStore: () => void;
}

const useWorkOSStore = create<WorkOSStore>()(
  persist(
    (set) => ({
      username: "",
      setUsername: (username: string) => set({ username }),
      isLoggedIn: false,
      setIsLoggedIn: (isLoggedIn: boolean) => set({ isLoggedIn }),
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

      resetIdleWarningSystem: () =>
        set({
          idleWarningCount: 0,
          idleCountdown: 10,
          isIdleWarningActive: false,
          isUserActive: false,
          lastActivityTime: Date.now(),
          isLoggedOutFromIdle: false,
        }),

      resetStore: () =>
        set({
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
        }),
    }),
    {
      name: "work-os-storage",
    }
  )
);

export default useWorkOSStore;
