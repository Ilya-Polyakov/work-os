"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

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
  const { simulateLoading, tabId } = useCrossTabSync();

  // Local loading state that prevents flickering
  const [localIsLoading, setLocalIsLoading] = useState(isLoading);

  // Sync local loading state with store, but prevent it from going false too quickly
  useEffect(() => {
    if (isLoading) {
      console.log("Login is loading, setting local state to true");
      // If store says loading, immediately set local to loading
      setLocalIsLoading(true);
    } else {
      console.log("Login is no longer loading, setting local state to false");
      // If store says not loading, add a small delay to prevent flicker
      const delay = setTimeout(() => {
        setLocalIsLoading(false);
      }, 50); // 50ms delay to let cross-tab sync work

      return () => clearTimeout(delay);
    }
  }, [isLoading]);

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

      // Use cross-tab synchronized loading simulation
      simulateLoading(
        12000,
        () => {
          setIsLoggedIn(true);
          setIsLoading(false);
          setLoadingProgress(0);
          setLoadingController(null);
        },
        tabId
      );
    } else {
      window.alert("Login failed: Invalid username or password.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Window
        titleBarContent={
          <>
            <Image
              src="/logo.png"
              alt="WorkOS Logo"
              width={14}
              height={14}
              priority
            />
            Welcome to WorkOS
          </>
        }
        windowContent={
          localIsLoading ? (
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
