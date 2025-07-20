"use client";

import useWorkOSStore from "@/hooks/useWorkOSStore";
import Login from "@/features/Login/Login";
import Work from "@/features/Work/Work";

export default function Home() {
  const { isLoggedIn } = useWorkOSStore();
  return <main className="">{isLoggedIn ? <Work /> : <Login />}</main>;
}
