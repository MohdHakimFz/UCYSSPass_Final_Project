import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import Layout from './components/Layout'
import Auth from './pages/Auth'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Passes from './pages/Passes'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/register" element={<Auth mode="register" />} />
          </Route>
          <Route element={<Layout protectedRoute />}>
            <Route path="/passes" element={<Passes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
