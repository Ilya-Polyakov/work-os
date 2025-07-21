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
      modalIsOpen: true,
      setModalIsOpen: (isOpen: boolean) => set({ modalIsOpen: isOpen }),
      resetStore: () =>
        set({
          isLoggedIn: false,
          username: "",
          isLoading: false,
          loadingProgress: 0,
          loadingController: null,
          modalIsOpen: false,
        }),
    }),
    {
      name: "work-os-storage",
    }
  )
);

export default useWorkOSStore;
