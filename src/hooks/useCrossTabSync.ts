import { useEffect, useCallback, useRef } from "react";
import useWorkOSStore from "./useWorkOSStore";

export const useCrossTabSync = () => {
  const {
    setIsLoggedIn,
    setUsername,
    setIsLoading,
    setLoadingProgress,
    setLoadingController,
    loadingProgress: currentLoadingProgress,
    isLoggedIn: currentlyLoggedIn,
    username: currentUsername,
    loadingController,
    isLoading: currentIsLoading,
    totalClicks: currentTotalClicks,
    clearLogoutFlag,
  } = useWorkOSStore();

  const tabId = useRef(
    `${Date.now()}-${Math.random().toString(36).substring(7)}`
  );
  const lastProgressUpdate = useRef(Date.now());
  const controllerHealthCheck = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (
      currentIsLoading &&
      loadingController &&
      loadingController !== tabId.current
    ) {
      if (controllerHealthCheck.current)
        clearInterval(controllerHealthCheck.current);
      lastProgressUpdate.current = Date.now();

      controllerHealthCheck.current = setInterval(() => {
        const timeSinceLastUpdate = Date.now() - lastProgressUpdate.current;
        const {
          isLoading,
          isLoggedIn,
          username: user,
        } = useWorkOSStore.getState();

        if (
          timeSinceLastUpdate > 3000 &&
          isLoading &&
          !isLoggedIn &&
          user?.trim()
        ) {
          let controllerStillSet = false;
          const raw = localStorage.getItem("work-os-storage");

          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              controllerStillSet =
                parsed.state.loadingController &&
                parsed.state.loadingController !== tabId.current;
            } catch {}
          }

          if (!controllerStillSet || timeSinceLastUpdate > 6000) {
            clearInterval(controllerHealthCheck.current!);
            controllerHealthCheck.current = null;
            setLoadingProgress(100);
            setTimeout(() => {
              setIsLoggedIn(true);
              setIsLoading(false);
            }, 500);
          }
        }
      }, 3000);
    } else {
      if (controllerHealthCheck.current) {
        clearInterval(controllerHealthCheck.current);
        controllerHealthCheck.current = null;
      }
    }

    return () => {
      if (controllerHealthCheck.current)
        clearInterval(controllerHealthCheck.current);
    };
  }, [
    currentIsLoading,
    loadingController,
    setIsLoggedIn,
    setIsLoading,
    setLoadingProgress,
  ]);

  useEffect(() => {
    const state = useWorkOSStore.getState();

    if (
      state.isLoading &&
      state.loadingController &&
      state.loadingController !== tabId.current &&
      !state.isLoggedIn
    ) {
      console.log(
        `Tab ${tabId.current}: Syncing from ${state.loadingController}`
      );
      setIsLoading(true);
      setUsername(state.username);
      setLoadingProgress(state.loadingProgress);
      setLoadingController(state.loadingController);
      lastProgressUpdate.current = Date.now();
      return;
    }

    if (
      state.isLoading &&
      !state.loadingController &&
      !state.isLoggedIn &&
      state.username?.trim()
    ) {
      setLoadingProgress(100);
      setTimeout(() => {
        setIsLoggedIn(true);
        setIsLoading(false);
        setUsername(state.username);
      }, 500);
    }
  }, [
    setIsLoading,
    setUsername,
    setLoadingProgress,
    setIsLoggedIn,
    setLoadingController,
  ]);

  const simulateLoading = useCallback(
    (totalDuration: number, onComplete: () => void, controllerId?: string) => {
      const isController = controllerId
        ? controllerId === tabId.current
        : loadingController === tabId.current;

      if (!isController) return;

      setLoadingProgress(0);
      let currentProgress = 0;
      const startTime = Date.now();

      const updateProgress = () => {
        const currentState = useWorkOSStore.getState();
        if (currentState.loadingController !== tabId.current) return;

        const elapsed = Date.now() - startTime;
        if (elapsed >= totalDuration) {
          setLoadingProgress(100);

          localStorage.setItem(
            "work-os-storage",
            JSON.stringify({
              state: {
                isLoggedIn: true,
                username: currentState.username,
                isLoading: false,
                loadingController: null,
                loadingProgress: 100,
                totalClicks: currentState.totalClicks,
              },
            })
          );

          setTimeout(() => {
            onComplete();
            setLoadingController(null);
          }, 1000);
          return;
        }

        const randomIncrement = Math.random() * 7 + 1;
        const timeBasedProgress = (elapsed / totalDuration) * 85;
        const newProgress = Math.min(
          currentProgress + randomIncrement,
          timeBasedProgress,
          95
        );

        currentProgress = newProgress;
        setLoadingProgress(Math.floor(currentProgress));

        const delay = Math.random() * 700 + 100;
        setTimeout(updateProgress, delay);
      };

      updateProgress();
    },
    [setLoadingProgress, setLoadingController, loadingController]
  );

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user-logout" && e.newValue) {
        setIsLoggedIn(false);
        setIsLoading(false);
        setLoadingProgress(0);
        setLoadingController(null);
        setUsername("");

        const {
          setIsLoggedOutFromIdle,
          setModalIsOpen,
          resetIdleWarningSystem,
        } = useWorkOSStore.getState();
        setIsLoggedOutFromIdle(false);
        setModalIsOpen(false);
        resetIdleWarningSystem();

        setTimeout(clearLogoutFlag, 100);
        return;
      }

      if (e.key !== "work-os-storage" || !e.newValue) return;

      try {
        const { state: newState } = JSON.parse(e.newValue);

        const noChange =
          newState?.isLoggedIn === currentlyLoggedIn &&
          newState?.isLoading === currentIsLoading &&
          newState?.username === currentUsername &&
          newState?.loadingProgress === currentLoadingProgress &&
          newState?.totalClicks === currentTotalClicks;

        if (noChange) return;

        const recentLogout = localStorage.getItem("user-logout");
        let shouldIgnoreLogin = false;

        if (recentLogout) {
          try {
            const { timestamp } = JSON.parse(recentLogout);
            if (Date.now() - timestamp < 2000) shouldIgnoreLogin = true;
          } catch {}
        }

        if (
          newState.totalClicks !== undefined &&
          newState.totalClicks > currentTotalClicks
        ) {
          console.log("🔄 Syncing totalClicks across tabs");
          useWorkOSStore.setState({ totalClicks: newState.totalClicks });
        }

        if (
          newState.isLoading &&
          !newState.loadingController &&
          !currentlyLoggedIn &&
          currentIsLoading &&
          newState.username?.trim()
        ) {
          setLoadingProgress(100);
          setTimeout(() => {
            setIsLoggedIn(true);
            setIsLoading(false);
            setUsername(newState.username);
          }, 500);
        }

        if (
          newState.isLoading &&
          newState.loadingController &&
          newState.loadingController !== tabId.current &&
          !currentIsLoading &&
          !shouldIgnoreLogin
        ) {
          console.log(
            `Tab ${tabId.current}: Syncing loading from ${newState.loadingController}`
          );
          setIsLoading(true);
          setUsername(newState.username);
          setLoadingProgress(newState.loadingProgress);
          setLoadingController(newState.loadingController);
          lastProgressUpdate.current = Date.now();
        }

        if (
          newState.isLoading &&
          newState.loadingController !== tabId.current &&
          typeof newState.loadingProgress === "number" &&
          currentIsLoading
        ) {
          setLoadingProgress(newState.loadingProgress);
          lastProgressUpdate.current = Date.now();
        }

        if (
          newState.isLoggedIn &&
          newState.username &&
          !newState.isLoading &&
          !currentlyLoggedIn &&
          !shouldIgnoreLogin
        ) {
          setIsLoggedIn(true);
          setIsLoading(false);
          setUsername(newState.username);
        } else if (
          !newState.isLoggedIn &&
          !newState.username &&
          currentlyLoggedIn
        ) {
          setIsLoggedIn(false);
          setUsername("");
        }
      } catch (err) {
        console.error("Error parsing storage event:", err);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [
    currentlyLoggedIn,
    currentUsername,
    currentIsLoading,
    currentTotalClicks,
    currentLoadingProgress,
    setIsLoggedIn,
    setUsername,
    setIsLoading,
    setLoadingProgress,
    setLoadingController,
    clearLogoutFlag,
  ]);

  useEffect(() => {
    const handleUnload = () => {
      const state = useWorkOSStore.getState();
      if (state.loadingController === tabId.current && state.isLoading) {
        console.log(`Tab ${tabId.current}: unloading, clearing controller`);
        setLoadingController(null);
        localStorage.setItem(
          "work-os-storage",
          JSON.stringify({
            state: { ...state, loadingController: null },
          })
        );
      }
    };

    const handlePageHide = (e: PageTransitionEvent) => {
      if (!e.persisted) handleUnload();
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [setLoadingController]);

  return { simulateLoading, tabId: tabId.current };
};
