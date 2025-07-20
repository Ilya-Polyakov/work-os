import Image from "next/image";
import Link from "next/link";

import useWorkOSStore from "@/hooks/useWorkOSStore";
import { useCrossTabSync } from "@/hooks/useCrossTabSync";
import Window from "@/components/Window";

import capitalizeWord from "@/utils/capitalizeWord";

const Work = () => {
  const { username, resetStore, totalClicks, incrementClicks } =
    useWorkOSStore();

  const displayName = username ? capitalizeWord(username) : "User";

  // Enable cross-tab logout synchronization only
  useCrossTabSync();

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Window
        titleBarContent={
          <>
            <Image src="/logo.png" alt="WorkOS Logo" width={14} height={14} />
            Greetings {displayName}
          </>
        }
        windowContent={
          <>
            <div className="flex flex-col gap-2 mb-2 pb-2 border-b">
              <p>Today is like any other day. We need you to push buttons.</p>
              <p>For every 12 button presses you will earn 1 credit.</p>

              <div className="p-6 flex flex-col items-center gap-2">
                <button onClick={incrementClicks}>
                  Button Pressed {totalClicks} times
                </button>
                <p className="text-center">
                  <strong>Credits: {Math.floor(totalClicks / 12)}</strong>
                </p>
              </div>
            </div>
            <div className="flex justify-between">
              <Link href="/about">
                <button className="cursor-pointer">About</button>
              </Link>

              <button
                className="cursor-pointer"
                onClick={() => {
                  resetStore();
                }}
              >
                Logout
              </button>
            </div>
          </>
        }
      />
    </div>
  );
};

export default Work;
