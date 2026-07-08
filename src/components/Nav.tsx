"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  username: string;
  role: string;
}

export default function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data));
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!user) return null;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const linkClasses = (path: string) =>
    `px-3 py-1.5 rounded-md text-sm transition-colors ${
      pathname.startsWith(path)
        ? "bg-zinc-100 text-zinc-900"
        : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
    }`;

  return (
    <nav className="border-b border-zinc-200 bg-white sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link href="/" className="font-semibold text-zinc-900 tracking-tight text-base">
            Study Pack
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            <Link href="/courses" className={linkClasses("/courses")}>Courses</Link>
            <Link href="/progress" className={linkClasses("/progress")}>Progress</Link>
            {user.role === "admin" && (
              <Link href="/admin" className={linkClasses("/admin")}>Admin</Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-sm text-zinc-500 hidden sm:inline">{user.username}</span>
          <button
            onClick={logout}
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors hidden sm:inline"
          >
            Logout
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-2 -mr-2 text-zinc-500 hover:text-zinc-900"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-zinc-100 bg-white px-4 py-3 space-y-1">
          <Link href="/courses" className={linkClasses("/courses") + " block"}>Courses</Link>
          <Link href="/progress" className={linkClasses("/progress") + " block"}>Progress</Link>
          {user.role === "admin" && (
            <Link href="/admin" className={linkClasses("/admin") + " block"}>Admin</Link>
          )}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-sm text-zinc-500">{user.username}</span>
            <button
              onClick={logout}
              className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
