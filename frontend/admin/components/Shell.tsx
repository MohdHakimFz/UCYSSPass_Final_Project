"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, Header, HeaderGlobalAction, HeaderGlobalBar, HeaderMenuItem, HeaderName, HeaderNavigation } from "@carbon/react";
import { Logout } from "@carbon/icons-react";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/events", label: "Events" },
  { href: "/bookings", label: "Bookings" },
  { href: "/venues", label: "Venues" },
  { href: "/users", label: "People" },
  { href: "/notifications", label: "Emails" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <p className="loading">Checking your session…</p>;

  const leave = () => signOut().then(() => router.replace("/login"));

  if (user.role !== "admin") {
    return (
      <main className="page">
        <h1 className="lede">This dashboard is for administrators.</h1>
        <p className="lede-sub">
          You&apos;re signed in as {user.email}, which has the {user.role} role. Sign in with an admin account to continue.
        </p>
        <div style={{ marginTop: 24 }}>
          <Button kind="tertiary" onClick={leave}>
            Sign out
          </Button>
        </div>
      </main>
    );
  }

  return (
    <>
      <Header aria-label="SentryPass Admin">
        <HeaderName as={Link} href="/" prefix="SentryPass">
          Admin
        </HeaderName>
        <HeaderNavigation aria-label="Main">
          {LINKS.map((l) => (
            <HeaderMenuItem
              key={l.href}
              as={Link}
              href={l.href}
              isCurrentPage={l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)}
            >
              {l.label}
            </HeaderMenuItem>
          ))}
        </HeaderNavigation>
        <HeaderGlobalBar>
          <span style={{ color: "#fff", fontSize: "0.875rem", padding: "0 8px" }}>{user.name}</span>
          <HeaderGlobalAction aria-label="Sign out" tooltipAlignment="end" onClick={leave}>
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>
      <main className="page">{children}</main>
    </>
  );
}
