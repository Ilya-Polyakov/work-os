"use client";

import { useState } from "react";
import Image from "next/image";
import Window from "@/components/Window";
import LoginForm from "./LoginForm";
import LoginProgressBar from "./LoginProgressBar";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

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
