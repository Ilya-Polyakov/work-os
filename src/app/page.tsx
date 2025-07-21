"use client";

import useWorkOSStore from "@/hooks/useWorkOSStore";
import { useStoreHydration } from "@/hooks/useStoreHydration";
import Login from "@/features/Login/Login";
import Work from "@/features/Work/Work";

export default function Home() {
  const { isLoggedIn } = useWorkOSStore();
  const isHydrated = useStoreHydration();

  if (!isHydrated) return;

  return <main className="">{isLoggedIn ? <Work /> : <Login />}</main>;
}
