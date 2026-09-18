"use client";

import { useEffect } from "react";
import { tokenStore } from "@/lib/api";
import { signInUrl } from "@/lib/portal";

// Receives the session token from the sign-in page, keeps it, and clears it from the address bar.
export default function Callback() {
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (token) tokenStore.set(token);
    window.location.replace(token ? "/" : signInUrl);
  }, []);
  return <p className="loading">Signing you in…</p>;
}
