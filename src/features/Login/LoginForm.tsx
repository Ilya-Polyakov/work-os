"use client";

import Link from "next/link";
import Image from "next/image";

interface LoginFormProps {
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

const LoginForm = ({ onSubmit }: LoginFormProps) => {
  return (
    <div className="flex gap-2">
      <Image
        src="/images/key.png"
        alt="Key Icon"
        width={80}
        height={80}
        className="hidden sm:block h-16 w-16 md:h-20 md:w-20"
      />
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-1">
          <Image
            src="/images/key.png"
            alt="Key Icon"
            width={32}
            height={32}
            className="sm:hidden h-8 w-8"
          />
          <p>Type a user name and password to log on to WorkOS.</p>
        </div>
        <form onSubmit={onSubmit}>
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

          <div className="flex justify-center gap-4 mt-2">
            <Link href="/about">
              <button className="cursor-pointer" type="button">
                About
              </button>
            </Link>
            <button className="cursor-pointer" type="submit">
              Log in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
