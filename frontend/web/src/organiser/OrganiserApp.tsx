import { Route, Routes } from 'react-router-dom'
import { Calendar, QrCode } from '@carbon/icons-react'
import DashboardLayout from '@/dashboard/DashboardLayout'
import { useAuth } from '@/lib/auth'
import MyEvents from './pages/MyEvents'
import EventEditor from './pages/EventEditor'
import CheckIn from './pages/CheckIn'

const LINKS = [
  { to: '/organiser', label: 'My events', icon: Calendar, end: true },
  { to: '/organiser/checkin', label: 'Check-in', icon: QrCode },
]

// Everything under /organiser. Loaded on demand so customers never download the dashboard code.
export default function OrganiserApp() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        element={<DashboardLayout area="Organiser" base="/organiser" links={LINKS} crossLink={user?.role === 'admin' ? { to: '/admin', label: 'Back to admin' } : undefined} />}
      >
        <Route index element={<MyEvents />} />
        <Route path="events/:id" element={<EventEditor />} />
        <Route path="checkin" element={<CheckIn />} />
      </Route>
    </Routes>
  )
}
