import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkOSStore {
  username: string;
  setUsername: (username: string) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  totalClicks: number;
  incrementClicks: () => void;
  resetClicks: () => void;
  resetStore: () => void;
}

const useWorkOSStore = create<WorkOSStore>()(
  persist(
    (set) => ({
      username: "",
      setUsername: (username: string) => set({ username }),
      isLoggedIn: false,
      setIsLoggedIn: (isLoggedIn: boolean) => set({ isLoggedIn }),
      totalClicks: 0,
      incrementClicks: () =>
        set((state) => ({
          totalClicks: state.totalClicks + 1,
        })),
      resetClicks: () => set({ totalClicks: 0 }),
      resetStore: () =>
        set({
          isLoggedIn: false,
          username: "",
        }),
    }),
    {
      name: "work-os-storage",
    }
  )
);

export default useWorkOSStore;
