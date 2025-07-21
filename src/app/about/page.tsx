import { Metadata } from "next";
import Window from "@/components/Window";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About WorkOS",
};

const About = () => {
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
            About WorkOS
          </>
        }
        windowContent={
          <>
            <p className="mb-2">
              WorkOS is a satirical web application demonstrating the usage of
              session management. Tech stack includes Next.js, Zustand, and{" "}
              <Link href="https://jdan.github.io/98.css/">98.css</Link>.
            </p>
            <div className="text-center">
              <Link href="/">
                <button className="cursor-pointer">Go back</button>
              </Link>
            </div>
          </>
        }
      />
    </div>
  );
};

export default About;
