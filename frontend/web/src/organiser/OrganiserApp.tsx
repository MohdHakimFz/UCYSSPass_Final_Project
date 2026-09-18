import { Route, Routes } from 'react-router-dom'
import DashboardLayout from '@/dashboard/DashboardLayout'
import MyEvents from './pages/MyEvents'
import EventEditor from './pages/EventEditor'
import CheckIn from './pages/CheckIn'

const LINKS = [
  { to: '/organiser', label: 'My events', end: true },
  { to: '/organiser/checkin', label: 'Check-in' },
]

// Everything under /organiser. Loaded on demand so customers never download the dashboard code.
export default function OrganiserApp() {
  return (
    <Routes>
      <Route element={<DashboardLayout area="Organiser" base="/organiser" links={LINKS} />}>
        <Route index element={<MyEvents />} />
        <Route path="events/:id" element={<EventEditor />} />
        <Route path="checkin" element={<CheckIn />} />
      </Route>
    </Routes>
  )
}
