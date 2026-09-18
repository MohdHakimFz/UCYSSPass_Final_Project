import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import Layout from './components/Layout'
import { Callback, SignIn } from './pages/SignIn'
import MyEvents from './pages/MyEvents'
import EventEditor from './pages/EventEditor'

// The QR scanner library is the heaviest dependency, so it only loads on the check-in screen.
const CheckIn = lazy(() => import('./pages/CheckIn'))

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<SignIn />} />
          <Route path="/auth/callback" element={<Callback />} />
          <Route element={<Layout />}>
            <Route path="/" element={<MyEvents />} />
            <Route path="/events/:id" element={<EventEditor />} />
            <Route
              path="/checkin"
              element={
                <Suspense fallback={<p className="loading">Loading the scanner…</p>}>
                  <CheckIn />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
