"use client";

import { useState } from "react";
import Image from "next/image";
import Window from "@/components/Window";
import LoginForm from "./LoginForm";
import LoginProgressBar from "./LoginProgressBar";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const simulateLoading = (totalDuration: number, onComplete: () => void) => {
    setLoadingProgress(0);
    let currentProgress = 0;
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsedTime = Date.now() - startTime;

      if (elapsedTime >= totalDuration) {
        // Loading complete
        setLoadingProgress(100);
        setTimeout(() => {
          onComplete();
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

  const handleLoadingComplete = () => {
    console.log("Loading complete!");
    setIsLoading(false);
  };

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
      setIsLoading(true);
      simulateLoading(12000, handleLoadingComplete);
      console.log("Login successful");
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
