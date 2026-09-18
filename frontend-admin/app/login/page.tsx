"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Notice } from "@/components/ui";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <aside className="gate-side">
        <div className="wordmark">
          <span>Admin</span>SentryPass
        </div>
        <div>
          <h1>See who&apos;s cleared to walk in.</h1>
          <p>Manage venues and people, and watch seats fill across every CTF, bootcamp and conference.</p>
        </div>
      </aside>
      <div className="gate-form">
        <form onSubmit={onSubmit}>
          <h2>Sign in</h2>
          {error && <Notice tone="error">{error}</Notice>}
          <label className="field">
            Email
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="btn" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
