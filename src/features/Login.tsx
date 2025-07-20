import Image from "next/image";
import Link from "next/link";
import Window from "@/components/Window";

const Login = () => {
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
            <p>Type a user name and password to log into WorkOS.</p>
            <form>
              <div className="flex gap-2 mb-2">
                <label className="w-[60px]" htmlFor="username">
                  User name:
                </label>
                <input type="text" id="username" className="flex-1" />
              </div>
              <div className="flex gap-2">
                <label className="w-[60px]" htmlFor="password">
                  Password:
                </label>
                <input type="password" id="password" className="flex-1" />
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
