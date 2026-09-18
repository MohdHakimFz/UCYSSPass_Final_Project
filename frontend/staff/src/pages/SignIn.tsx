import { useEffect } from 'react'
import { signInUrl } from '../lib/portal'
import { tokenStore } from '../lib/api'

// There is no sign-in form here: sign-in lives on the customer site, which sends organisers back.
export function SignIn() {
  useEffect(() => {
    window.location.replace(signInUrl)
  }, [])
  return <p className="loading">Taking you to sign in…</p>
}

// Receives the session token from the sign-in page, keeps it, and clears it from the address bar.
export function Callback() {
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (token) tokenStore.set(token)
    window.location.replace(token ? '/' : signInUrl)
  }, [])
  return <p className="loading">Signing you in…</p>
}
