import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

import Window from "./Window";

interface ModalWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalWindow = ({ isOpen, onClose }: ModalWindowProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Set mounted to true after component mounts (client-side)
    setIsMounted(true);
  }, []);

  // Don't render anything on server-side or if not open
  if (!isMounted || !isOpen) return null;

  const isActive = false; // Placeholder for active state logic

  return createPortal(
    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <Window
        onClose={onClose}
        titleBarContent={
          <>
            <Image
              src="/logo.png"
              alt="WorkOS Logo"
              width={14}
              height={14}
              priority
            />
            Get back to work!
          </>
        }
        windowContent={
          <>
            <div className="flex flex-col items-center">
              <Image
                src={`/images/eyes-${isActive ? "calm" : "angry"}.png`}
                alt="Angry Eyes"
                width={128}
                height={128}
              />
              <div className="flex flex-col items-center gap-2">
                <p>
                  <strong>First Warning</strong>
                </p>

                <p>You have been idle for over 30 seconds.</p>
                <p>
                  You have <strong>10 seconds</strong> to return.
                </p>
                <button onClick={onClose}>Continue</button>
              </div>
            </div>
          </>
        }
      />
    </div>,
    document.body
  );
};

export default ModalWindow;
