import { Route, Routes } from 'react-router-dom'
import DashboardLayout from '@/dashboard/DashboardLayout'
import Overview from './pages/Overview'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Bookings from './pages/Bookings'
import Venues from './pages/Venues'
import People from './pages/People'
import Emails from './pages/Emails'

const LINKS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/venues', label: 'Venues' },
  { to: '/admin/users', label: 'People' },
  { to: '/admin/notifications', label: 'Emails' },
]

// Everything under /admin. Loaded on demand so customers never download the dashboard code.
export default function AdminApp() {
  return (
    <Routes>
      <Route element={<DashboardLayout area="Admin" base="/admin" links={LINKS} />}>
        <Route index element={<Overview />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="venues" element={<Venues />} />
        <Route path="users" element={<People />} />
        <Route path="notifications" element={<Emails />} />
      </Route>
    </Routes>
  )
}
