import React, { useEffect } from 'react'
import { keycloakLogin } from '../services/keycloak'

const KC_URL = import.meta.env.VITE_KEYCLOAK_URL

export default function Login() {
  useEffect(() => {
    const token = localStorage.getItem('testhub_token')
    const user  = localStorage.getItem('testhub_user')
    if (token && user) {
      window.location.replace('/')
      return
    }
    if (KC_URL) keycloakLogin()
  }, [])

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0d0d0d', flexDirection:'column', gap:16 }}>
      <div style={{ width:32, height:32, border:'3px solid #333', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{String.raw`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ color:'#888', fontSize:14 }}>Redirecionando para Keycloak SSO...</div>
      <button onClick={keycloakLogin} style={{ marginTop:8, padding:'8px 20px', background:'transparent', color:'#555', border:'1px solid #333', borderRadius:6, cursor:'pointer', fontSize:12 }}>
        Clique aqui se nao for redirecionado
      </button>
    </div>
  )
}
