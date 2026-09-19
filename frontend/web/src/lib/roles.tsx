import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role, User } from './api'
import { useAuth } from './auth'

/** The first screen each role sees after signing in. */
export const HOME: Record<Role, string> = {
  customer: '/passes',
  organiser: '/organiser',
  admin: '/admin',
}

// Where each role may be sent straight after signing in. Admins may also open /organiser, but only by choosing to:
// arriving from an "organiser" link must not drop them into the organiser dashboard.
const AREAS: Record<Role, string[]> = {
  customer: [],
  organiser: ['/organiser'],
  admin: ['/admin'],
}

/**
 * Where to send someone after signing in: the page they were heading to if their role may open it,
 * otherwise their own home. A customer is never sent into a dashboard, and staff never into customer pages.
 */
export function landingFor(user: User, next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return HOME[user.role]
  const inDashboard = next.startsWith('/admin') || next.startsWith('/organiser')
  if (user.role === 'customer') return inDashboard ? HOME.customer : next
  return AREAS[user.role].some((a) => next.startsWith(a)) ? next : HOME[user.role]
}

/**
 * Route guard. Signed-out visitors go to the one shared sign-in page; signed-in people who open an area
 * that is not theirs are sent back to their own home. The API enforces the same rules on every request,
 * so this only decides what to show.
 */
export default function RequireRole({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <p style={{ padding: '96px 24px', textAlign: 'center', font: 'inherit', opacity: 0.7 }}>Checking your session…</p>
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  if (!roles.includes(user.role)) return <Navigate to={HOME[user.role]} replace />
  return <Outlet />
}
