"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

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

      setSuccess(true);
      window.location.href = redirect;
    } catch {
      setError("Network error. Check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] px-4">
      <div className="w-full max-w-sm">
        <div className="card p-7 sm:p-8">
          <div className="flex items-baseline gap-1.5 mb-6 justify-center">
            <span className="display text-2xl text-ink">Study Pack</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent mb-1" aria-hidden />
          </div>

          {success ? (
            <div className="text-center py-4">
              <p className="text-sm font-medium text-ink mb-1">Signed in</p>
              <p className="text-sm text-ink-faint">Taking you back…</p>
              <div className="skeleton h-1 w-full mt-5 rounded-full" />
            </div>
          ) : (
            <>
              <p className="text-sm text-ink-soft text-center mb-7">
                Good to see you. Enter your username to pick up where you left
                off.
              </p>

              <form onSubmit={login} className="space-y-4">
                <div>
                  <label htmlFor="username" className="eyebrow block mb-2">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your username"
                    autoFocus
                    autoComplete="username"
                    className="field"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || !username.trim()}
                  className="btn-primary w-full py-3"
                >
                  {loading ? "Signing in…" : "Continue"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-ink-faint mt-5">
          New here? Just pick a username — your account is created instantly.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
