import { Route, Routes } from 'react-router-dom'
import { Calendar, Dashboard, Email, Location, Ticket, UserMultiple } from '@carbon/icons-react'
import DashboardLayout from '@/dashboard/DashboardLayout'
import Overview from './pages/Overview'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Bookings from './pages/Bookings'
import Venues from './pages/Venues'
import People from './pages/People'
import Emails from './pages/Emails'

const LINKS = [
  { to: '/admin', label: 'Overview', icon: Dashboard, end: true },
  { to: '/admin/events', label: 'Events', icon: Calendar },
  { to: '/admin/bookings', label: 'Bookings', icon: Ticket },
  { to: '/admin/venues', label: 'Venues', icon: Location },
  { to: '/admin/users', label: 'People', icon: UserMultiple },
  { to: '/admin/notifications', label: 'Emails', icon: Email },
]

// Everything under /admin. Loaded on demand so customers never download the dashboard code.
export default function AdminApp() {
  return (
    <Routes>
      <Route element={<DashboardLayout area="Admin" base="/admin" links={LINKS} crossLink={{ to: '/organiser', label: 'Organiser tools' }} />}>
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
