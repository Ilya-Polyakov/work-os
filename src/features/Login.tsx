"use client";

import Image from "next/image";
import Link from "next/link";
import Window from "@/components/Window";

const Login = () => {
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
      console.log("Login successful");
    } else {
      console.log("Login failed");
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
          <div className="flex flex-col gap-2">
            <p>Type a user name and password to log on to WorkOS.</p>
            <form onSubmit={handleSubmit}>
              <div className="flex gap-2 mb-2">
                <label className="w-[60px]" htmlFor="username">
                  User name:
                </label>
                <input
                  required
                  type="text"
                  id="username"
                  name="username"
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2">
                <label className="w-[60px]" htmlFor="password">
                  Password:
                </label>
                <input
                  required
                  type="password"
                  id="password"
                  name="password"
                  className="flex-1"
                />
              </div>

              <div className="flex justify-center gap-4 mt-4">
                <button type="submit">Log in</button>
                <Link href="/about">
                  <button>About</button>
                </Link>
              </div>
            </form>
          </div>
        }
      />
    </div>
  );
};

export default Login;
