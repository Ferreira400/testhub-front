/**
 * src/context/AuthContext.jsx  — versão com Keycloak
 * 
 * Substitui o AuthContext.jsx existente.
 * Suporta modo híbrido: Keycloak SSO ou login local.
 */
import React, { createContext, useContext, useState, useEffect } from 'react'
import { auth as authApi } from '../services/api'
import {
  keycloakLogin,
  keycloakLogout,
  getStoredUser,
  isKeycloakEnabled,
} from '../services/keycloak'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('testhub_user') || 'null') } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const keycloakMode = isKeycloakEnabled()

  // ── Login ──────────────────────────────────────────────────
  const login = async (email, password) => {
    if (keycloakMode) {
      // Redireciona para Keycloak — não há retorno aqui
      keycloakLogin()
      return { ok: true }
    }
    // Login local (modo sem Keycloak)
    setLoading(true)
    try {
      const { data } = await authApi.login({ email, password })
      localStorage.setItem('testhub_token', data.token)
      const u = { ...data.user, source: 'local' }
      localStorage.setItem('testhub_user', JSON.stringify(u))
      setUser(u)
      return { ok: true }
    } catch (e) {
      return { ok: false, msg: e.response?.data?.error || 'Erro ao fazer login' }
    } finally { setLoading(false) }
  }

  // ── Logout ─────────────────────────────────────────────────
  const logout = () => {
    if (keycloakMode && user?.source === 'keycloak') {
      keycloakLogout()   // redireciona para Keycloak logout
    } else {
      localStorage.removeItem('testhub_token')
      localStorage.removeItem('testhub_user')
      setUser(null)
    }
  }

  // ── Callback do Keycloak (após redirect) ───────────────────
  const handleKeycloakCallback = (userData) => {
    setUser(userData)
  }

  // ── Helpers de permissão ───────────────────────────────────
  const hasRole = (...roles) => {
    if (!user) return false
    const userRoles = user.roles || [user.role]
    return roles.some(r => userRoles.includes(r))
  }

  const isAdmin   = () => hasRole('admin')
  const isManager = () => hasRole('admin', 'manager')
  const canWrite  = () => hasRole('admin', 'manager', 'qa_engineer')

  return (
    <Ctx.Provider value={{
      user, loading, keycloakMode,
      login, logout, handleKeycloakCallback,
      hasRole, isAdmin, isManager, canWrite,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
