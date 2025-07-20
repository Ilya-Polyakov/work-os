"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import Window from "@/components/Window";
import LoginForm from "./LoginForm";
import LoginProgressBar from "./LoginProgressBar";

import useWorkOSStore from "@/hooks/useWorkOSStore";
import { useCrossTabSync } from "@/hooks/useCrossTabSync";

const Login = () => {
  const {
    setIsLoggedIn,
    setUsername,
    isLoading,
    setIsLoading,
    loadingProgress,
    setLoadingProgress,
    setLoadingController,
  } = useWorkOSStore();

  // Get cross-tab sync functions
  const { tabId } = useCrossTabSync();

  // Track if we've already handled recovery to prevent multiple recoveries
  const recoveryHandled = useRef(false);

  // Detect and recover from interrupted loading sessions
  useEffect(() => {
    // Only run recovery check on initial mount
    const checkForInterruptedSession = () => {
      const currentState = useWorkOSStore.getState();
      if (
        currentState.isLoading &&
        currentState.loadingProgress < 100 &&
        !recoveryHandled.current
      ) {
        console.log("Detected interrupted loading session, recovering...");
        recoveryHandled.current = true;

        // Complete the loading immediately since we can't resume the exact timer
        setTimeout(() => {
          useWorkOSStore.getState().setLoadingProgress(100);
          setTimeout(() => {
            const state = useWorkOSStore.getState();
            state.setIsLoggedIn(true);
            state.setIsLoading(false);
          }, 1000);
        }, 1500);
      }
    };

    // Run the check once on mount
    checkForInterruptedSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password"),
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log("Login successful, starting loading...");

      // Set this tab as the loading controller
      setLoadingController(tabId);
      setIsLoading(true);
      setUsername(formData.get("username") as string);

      // Realistic loading simulation with random intervals
      const simulateRealisticLoading = (totalDuration: number) => {
        setLoadingProgress(0);
        let currentProgress = 0;
        const startTime = Date.now();

        const updateProgress = () => {
          // Check if we're still the controller (another tab might have taken over)
          const currentState = useWorkOSStore.getState();
          if (currentState.loadingController !== tabId) {
            return; // Stop if we're no longer the controller
          }

          const elapsedTime = Date.now() - startTime;

          if (elapsedTime >= totalDuration) {
            // Loading complete
            setLoadingProgress(100);
            setTimeout(() => {
              setIsLoggedIn(true);
              setIsLoading(false);
              setLoadingController(null); // Release control
            }, 1000); // Small delay to show 100% completion
            return;
          }

          // Calculate random increment (1-8% at a time)
          const randomIncrement = Math.random() * 7 + 1;

          // Don't let progress exceed what it should be based on time elapsed
          const timeBasedProgress = (elapsedTime / totalDuration) * 85; // Cap at 85% until complete
          const newProgress = Math.min(
            currentProgress + randomIncrement,
            timeBasedProgress,
            95 // Never exceed 95% until completion
          );

          currentProgress = newProgress;
          setLoadingProgress(Math.floor(currentProgress));

          // Schedule next update with random delay (100-800ms)
          const randomDelay = Math.random() * 700 + 100;
          setTimeout(updateProgress, randomDelay);
        };

        updateProgress();
      };

      // Start the 12-second realistic loading simulation
      simulateRealisticLoading(12000);
    } else {
      window.alert("Login failed: Invalid username or password.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Window
        titleBarContent={
          <>
            <Image src="/logo.png" alt="WorkOS Logo" width={14} height={14} />
            Welcome to WorkOS
          </>
        }
        windowContent={
          isLoading ? (
            <LoginProgressBar loadingProgress={loadingProgress} />
          ) : (
            <LoginForm onSubmit={handleSubmit} />
          )
        }
      />
    </div>
  );
};

export default Login;
