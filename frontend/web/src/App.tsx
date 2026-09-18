import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import RequireRole from '@/lib/roles'
import Layout from '@/customer/Layout'
import Home from '@/customer/pages/Home'
import Auth from '@/customer/pages/Auth'
import Events from '@/customer/pages/Events'
import EventDetail from '@/customer/pages/EventDetail'
import Passes from '@/customer/pages/Passes'
import Profile from '@/customer/pages/Profile'

// The two dashboards are separate chunks: a customer never downloads them.
const OrganiserApp = lazy(() => import('@/organiser/OrganiserApp'))
const AdminApp = lazy(() => import('@/admin/AdminApp'))

const loading = <p style={{ padding: '96px 24px', textAlign: 'center', opacity: 0.7 }}>Loading…</p>

/**
 * One app, one sign-in page, three areas:
 *   public + customer  /  /events /login /passes /profile
 *   organiser          /organiser/*   (organisers and admins)
 *   admin              /admin/*       (admins only)
 * Each area has its own layout and guard. The API repeats the same checks on every request.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/register" element={<Auth mode="register" />} />
            <Route element={<RequireRole roles={['customer']} />}>
              <Route path="/passes" element={<Passes />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<RequireRole roles={['organiser', 'admin']} />}>
            <Route path="/organiser/*" element={<Suspense fallback={loading}><OrganiserApp /></Suspense>} />
          </Route>

          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/admin/*" element={<Suspense fallback={loading}><AdminApp /></Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
