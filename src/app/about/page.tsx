import Window from "@/components/Window";
import Image from "next/image";
import Link from "next/link";

const About = () => {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Window
        titleBarContent={
          <>
            <Image src="/logo.png" alt="WorkOS Logo" width={14} height={14} />
            About WorkOS
          </>
        }
        windowContent={
          <div className="flex flex-col gap-2">
            <p>
              WorkOS is a satirical web application demonstrating the usage of
              session management. Tech stack includes Next.js, Zustand, and{" "}
              <Link href="https://jdan.github.io/98.css/">98.css</Link>.
            </p>
            <Link href="/" className="text-center">
              <button>Go back</button>
            </Link>
          </div>
        }
      />
    </div>
  );
};

export default About;
