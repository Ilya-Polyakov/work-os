"use client";

import useWorkOSStore from "@/hooks/useWorkOSStore";
import { useStoreHydration } from "@/hooks/useStoreHydration";
import Login from "@/features/Login/Login";
import Work from "@/features/Work/Work";
import WarningWindow from "@/features/Warning/WarningWindow";

export default function Home() {
  const { isLoggedIn, modalIsOpen, setModalIsOpen } = useWorkOSStore();
  const isHydrated = useStoreHydration();

  if (!isHydrated) return;

  return (
    <main className="relative h-screen w-screen">
      {isLoggedIn ? <Work /> : <Login />}
      <WarningWindow
        isOpen={modalIsOpen}
        onClose={() => setModalIsOpen(false)}
      />
    </main>
  );
}
