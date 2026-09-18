"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/events", label: "Events" },
  { href: "/bookings", label: "Bookings" },
  { href: "/venues", label: "Venues" },
  { href: "/users", label: "People" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <p className="loading">Checking your session…</p>;

  if (user.role !== "admin") {
    return (
      <main className="page">
        <h1 className="lede">This dashboard is for administrators.</h1>
        <p className="lede-sub">
          You&apos;re signed in as {user.email}, which has the {user.role} role. Sign in with an admin
          account to continue.
        </p>
        <p style={{ marginTop: 24 }}>
          <button className="btn" onClick={() => signOut().then(() => router.replace("/login"))}>
            Sign out
          </button>
        </p>
      </main>
    );
  }

  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <Link href="/" className="wordmark">
            <span>Admin</span>SentryPass
          </Link>
          <nav className="nav" aria-label="Main">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={(l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)) ? "page" : undefined}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="who">
            <span>{user.name}</span>
            <button onClick={() => signOut().then(() => router.replace("/login"))}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
