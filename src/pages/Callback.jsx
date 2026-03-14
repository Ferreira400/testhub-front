import React, { useEffect, useState, useRef } from 'react'

const KC_URL    = import.meta.env.VITE_KEYCLOAK_URL
const KC_REALM  = import.meta.env.VITE_KEYCLOAK_REALM  || 'testhub'
const KC_CLIENT = import.meta.env.VITE_KEYCLOAK_CLIENT || 'testhub-frontend'
const BASE      = `${KC_URL}/realms/${KC_REALM}/protocol/openid-connect`

export default function Callback() {
  const [error, setError] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')
    const errMsg = params.get('error')

    if (errMsg || !code) {
      setError(params.get('error_description') || errMsg || 'Código não encontrado')
      return
    }

    const verifier = sessionStorage.getItem('pkce_verifier')
    sessionStorage.removeItem('pkce_verifier')
    sessionStorage.removeItem('pkce_state')

    const body = new URLSearchParams({
      grant_type:   'authorization_code',
      client_id:    KC_CLIENT,
      redirect_uri: window.location.origin + '/callback',
      code,
      ...(verifier ? { code_verifier: verifier } : {}),
    })

    fetch(`${BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error_description || data.error)

        // Salva tokens
        localStorage.setItem('testhub_token',    data.access_token)
        localStorage.setItem('kc_refresh_token', data.refresh_token || '')
        if (data.id_token) localStorage.setItem('kc_id_token', data.id_token)

        // Parseia e salva usuário
        const payload = JSON.parse(atob(
          data.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')
        ))
        const roles = payload.roles || payload.realm_access?.roles || []
        const role  = ['admin','manager','qa_engineer','viewer'].find(r => roles.includes(r)) || 'viewer'
        const user  = {
          id:       payload.sub,
          name:     payload.name || `${payload.given_name||''} ${payload.family_name||''}`.trim(),
          email:    payload.email,
          role, roles,
          groups:   payload.groups   || [],
          squad_id: payload.squad_id || null,
          source:   'keycloak',
        }
        localStorage.setItem('testhub_user', JSON.stringify(user))

        // Hard redirect — garante que o React rele o localStorage do zero
        window.location.replace('/')
      })
      .catch(err => setError(err.message || 'Erro ao autenticar'))
  }, [])

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0d0d0d', flexDirection:'column', gap:16 }}>
      <div style={{ color:'#ff4d4d', fontSize:16, fontWeight:600 }}>Erro na autenticação</div>
      <div style={{ color:'#888', fontSize:13 }}>{error}</div>
      <button onClick={() => window.location.href='/login'} style={{ marginTop:8, padding:'8px 20px', background:'#6366f1', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>
        Voltar ao login
      </button>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0d0d0d', flexDirection:'column', gap:16 }}>
      <div style={{ width:32, height:32, border:'3px solid #333', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ color:'#888', fontSize:14 }}>Autenticando com Keycloak…</div>
    </div>
  )
}
