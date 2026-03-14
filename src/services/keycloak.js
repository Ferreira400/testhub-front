/**
 * src/services/keycloak.js
 * 
 * Autenticação OIDC com Keycloak via Authorization Code + PKCE
 * Sem biblioteca externa — implementação nativa com Web Crypto API
 */

const KC_URL      = import.meta.env.VITE_KEYCLOAK_URL   || 'http://localhost:8080';
const KC_REALM    = import.meta.env.VITE_KEYCLOAK_REALM || 'testhub';
const KC_CLIENT   = import.meta.env.VITE_KEYCLOAK_CLIENT|| 'testhub-frontend';
const REDIRECT_URI= window.location.origin + '/callback';

const BASE = `${KC_URL}/realms/${KC_REALM}/protocol/openid-connect`;

// ── PKCE helpers ─────────────────────────────────────────────

function randomBase64(len = 32) {
  const arr = crypto.getRandomValues(new Uint8Array(len));
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function sha256Base64(plain) {
  const data    = new TextEncoder().encode(plain);
  const hash    = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ── Login: redireciona para Keycloak ─────────────────────────

export async function keycloakLogin() {
  const verifier  = randomBase64(64);
  const challenge = await sha256Base64(verifier);
  const state     = randomBase64(16);
  const nonce     = randomBase64(16);

  sessionStorage.setItem('pkce_verifier', verifier);
  sessionStorage.setItem('pkce_state',    state);

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             KC_CLIENT,
    redirect_uri:          REDIRECT_URI,
    scope:                 'openid profile email',
    state,
    nonce,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    kc_locale:             'pt-BR',
  });

  window.location.href = `${BASE}/auth?${params}`;
}

// ── Callback: troca code por tokens ──────────────────────────

export async function handleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code      = urlParams.get('code');
  const state     = urlParams.get('state');
  const error     = urlParams.get('error');

  if (error) throw new Error(urlParams.get('error_description') || error);
  if (!code)  throw new Error('Código de autorização não encontrado');
  if (state !== sessionStorage.getItem('pkce_state')) throw new Error('State inválido — possível CSRF');

  const verifier = sessionStorage.getItem('pkce_verifier');
  sessionStorage.removeItem('pkce_verifier');
  sessionStorage.removeItem('pkce_state');

  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     KC_CLIENT,
    redirect_uri:  REDIRECT_URI,
    code,
    code_verifier: verifier,
  });

  const res  = await fetch(`${BASE}/token`, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Falha ao obter token');

  storeTokens(data);
  return parseUser(data.access_token);
}

// ── Logout ────────────────────────────────────────────────────

export function keycloakLogout() {
  const idToken = localStorage.getItem('kc_id_token');
  clearTokens();
  const params = new URLSearchParams({
    client_id:               KC_CLIENT,
    post_logout_redirect_uri: window.location.origin + '/login',
    ...(idToken ? { id_token_hint: idToken } : {}),
  });
  window.location.href = `${BASE}/logout?${params}`;
}

// ── Token refresh ─────────────────────────────────────────────

export async function refreshToken() {
  const refresh = localStorage.getItem('kc_refresh_token');
  if (!refresh) throw new Error('Sem refresh token');

  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     KC_CLIENT,
    refresh_token: refresh,
  });

  const res  = await fetch(`${BASE}/token`, { method:'POST', body, headers:{ 'Content-Type':'application/x-www-form-urlencoded' } });
  const data = await res.json();
  if (!res.ok) { clearTokens(); throw new Error('Refresh expirado — faça login novamente'); }

  storeTokens(data);
  return data.access_token;
}

// ── UserInfo via OIDC ─────────────────────────────────────────

export async function fetchUserInfo() {
  const token = localStorage.getItem('testhub_token');
  if (!token) return null;
  const res = await fetch(`${BASE}/userinfo`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return res.json();
}

// ── Helpers internos ──────────────────────────────────────────

function storeTokens(data) {
  localStorage.setItem('testhub_token',  data.access_token);
  localStorage.setItem('kc_refresh_token', data.refresh_token);
  if (data.id_token) localStorage.setItem('kc_id_token', data.id_token);
  // Agenda refresh automático 60s antes de expirar
  if (data.expires_in) {
    const ms = (data.expires_in - 60) * 1000;
    if (ms > 0) setTimeout(() => refreshToken().catch(keycloakLogout), ms);
  }
}

function clearTokens() {
  ['testhub_token','kc_refresh_token','kc_id_token','testhub_user'].forEach(k => localStorage.removeItem(k));
}

function parseUser(accessToken) {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    const roles   = payload.roles || payload.realm_access?.roles || [];
    const PRIORITY= ['admin','manager','qa_engineer','viewer'];
    const role    = PRIORITY.find(r => roles.includes(r)) || 'viewer';
    const user = {
      id:       payload.sub,
      name:     payload.name || `${payload.given_name||''} ${payload.family_name||''}`.trim(),
      email:    payload.email,
      role,
      roles,
      groups:   payload.groups || [],
      squad_id: payload.squad_id || null,
      source:   'keycloak',
    };
    localStorage.setItem('testhub_user', JSON.stringify(user));
    return user;
  } catch { return null; }
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('testhub_user') || 'null'); } catch { return null; }
}

export function isKeycloakEnabled() {
  return !!import.meta.env.VITE_KEYCLOAK_URL;
}
