import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Squads     from './pages/Squads'
import Projects   from './pages/Projects'
import TestCases  from './pages/TestCases'
import Cycles     from './pages/Cycles'
import Executions from './pages/Executions'
import Reports    from './pages/Reports'
import Callback   from './pages/Callback'
import Jira from './pages/Jira'
import Bugs from './pages/Bugs'
import BusinessUnits from './pages/BusinessUnits'
import CoverageReport from './pages/CoverageReport'
import Profile from './pages/Profile'

function Guard({ children }) {
  const { user } = useAuth()
  const token     = localStorage.getItem('testhub_token')
  const savedUser = localStorage.getItem('testhub_user')

  // Tem token E user no localStorage → deixa passar mesmo se contexto ainda não carregou
  if (token && savedUser) return children

  // Sem nada → login
  if (!user) return <Navigate to="/login" replace />

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"      element={<Login />} />
          <Route path="/callback"   element={<Callback />} />
          <Route path="/"           element={<Guard><Dashboard /></Guard>} />
          <Route path="/squads"     element={<Guard><Squads /></Guard>} />
          <Route path="/projects"   element={<Guard><Projects /></Guard>} />
          <Route path="/test-cases" element={<Guard><TestCases /></Guard>} />
          <Route path="/cycles"     element={<Guard><Cycles /></Guard>} />
          <Route path="/executions" element={<Guard><Executions /></Guard>} />
          <Route path="/reports"    element={<Guard><Reports /></Guard>} />
          <Route path="*"           element={<Navigate to="/" replace />} />
          <Route path="/profile" element={<Guard><Profile /></Guard>} />
          <Route path="/coverage" element={<Guard><CoverageReport /></Guard>} />
          <Route path="/business-units" element={<Guard><BusinessUnits /></Guard>} />
          <Route path="/bugs" element={<Guard><Bugs /></Guard>} />
          <Route path="/jira" element={<Guard><Jira /></Guard>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}



