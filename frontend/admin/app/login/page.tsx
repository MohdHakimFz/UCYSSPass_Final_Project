"use client";

import { useEffect } from "react";
import { signInUrl } from "@/lib/portal";

// There is no sign-in form here: sign-in lives on the customer site, which sends admins back.
export default function LoginPage() {
  useEffect(() => {
    window.location.replace(signInUrl);
  }, []);
  return <p className="loading">Taking you to sign in…</p>;
}
