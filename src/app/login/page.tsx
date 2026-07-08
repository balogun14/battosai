"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 text-center mb-2">
          Study Pack
        </h1>
        <p className="text-sm text-zinc-500 text-center mb-8">
          Enter your username to continue
        </p>

        <form onSubmit={login} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your username"
            autoFocus
            className="w-full px-4 py-3 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
