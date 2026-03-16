import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { users as usersApi, squads as squadsApi } from '../services/api'
import Layout from '../../Layout'

const ROLE_CONFIG = {
  admin:       { label: 'Admin',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  manager:     { label: 'Manager',     color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  qa_engineer: { label: 'QA Engineer', color: '#4f7cff', bg: 'rgba(79,124,255,0.12)'  },
  viewer:      { label: 'Viewer',      color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
}

const Avatar = ({ name, size = 80, color = '#4f7cff' }) => {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}, ${color}99)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, color: '#fff',
      boxShadow: `0 8px 32px ${color}44`,
      letterSpacing: '-.02em',
    }}>{initials}</div>
  )
}

const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 120,
    display: 'flex', alignItems: 'center', gap: 14,
  }}>
    <span style={{ fontSize: 24 }}>{icon}</span>
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--text-pri)', letterSpacing: '-.03em' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '.04em', marginTop: 1 }}>{label.toUpperCase()}</div>
    </div>
  </div>
)

export default function Profile() {
  const { user: authUser, logout } = useAuth()
  const [profile,   setProfile]   = useState(null)
  const [squads,    setSquads]    = useState([])
  const [execStats, setExecStats] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [form,      setForm]      = useState({ name: '', avatar_url: '' })
  const [tab,       setTab]       = useState('overview')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      // Busca dados do usuário
      const usersRes = await usersApi.list()
      const allUsers = usersRes.data || []
      const me = allUsers.find(u => u.email === authUser?.email) || allUsers[0]
      if (me) {
        setProfile(me)
        setForm({ name: me.name || '', avatar_url: me.avatar_url || '' })
      }

      // Busca squads do usuário
      const squadsRes = await squadsApi.list()
      const allSquads = squadsRes.data || []
      // Filtra squads onde o usuário é membro
      const mySquads = []
      for (const s of allSquads) {
        try {
          const detail = await squadsApi.getById(s.id)
          const members = detail.data?.members || []
          if (members.find(m => m.email === authUser?.email)) {
            mySquads.push({ ...s, squad_role: members.find(m => m.email === authUser?.email)?.squad_role })
          }
        } catch (_) {}
      }
      setSquads(mySquads)

      // Stats de execução
      const token = localStorage.getItem('testhub_token')
      const statsRes = await fetch('/api/reports/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json())

      const byUser = (statsRes.by_user || []).find(u => u.name === me?.name)
      setExecStats(byUser)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await usersApi.update(profile.id, { name: form.name })
      setProfile(p => ({ ...p, name: form.name }))
      setEditing(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const role = ROLE_CONFIG[profile?.role] || ROLE_CONFIG.viewer
  const passRate = execStats
    ? Math.round((Number(execStats.passed || 0) / Math.max(Number(execStats.total || 1), 1)) * 100)
    : null

  if (loading) return (
    <Layout>
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        Carregando perfil…
      </div>
    </Layout>
  )

  return (
    <Layout>
      {/* Header do perfil */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 18,
        background: `linear-gradient(135deg, rgba(79,124,255,0.08) 0%, transparent 50%)`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decoração de fundo */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(79,124,255,0.05)', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
          <Avatar name={profile?.name} size={88} color="#4f7cff" />

          <div style={{ flex: 1, minWidth: 200 }}>
            {editing ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <input className="input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{ fontSize: 20, fontWeight: 700, maxWidth: 280 }}
                  placeholder="Seu nome" />
                <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={saving}>
                  {saving && <span className="spinner spinner-sm" />}Salvar
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-pri)', letterSpacing: '-.03em' }}>
                  {profile?.name}
                </div>
                <button className="btn btn-ghost btn-xs" onClick={() => setEditing(true)}
                  style={{ fontSize: 11 }}>✏️ Editar</button>
              </div>
            )}

            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
              {profile?.email}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Role badge */}
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20,
                background: role.bg, color: role.color, border: `1px solid ${role.color}44`,
              }}>
                {role.label}
              </span>

              {/* Keycloak badge */}
              {authUser?.source === 'keycloak' && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: 'rgba(34,197,94,0.12)', color: 'var(--green)',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}>
                  🔐 SSO Keycloak
                </span>
              )}

              {/* Status ativo */}
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                background: 'rgba(34,197,94,0.12)', color: 'var(--green)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                Ativo
              </span>
            </div>
          </div>

          {/* Botão sair */}
          <button className="btn btn-ghost btn-sm" onClick={logout}
            style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
            Sair
          </button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <StatCard icon="🏢" label="Squads" value={squads.length} />
        <StatCard icon="▶" label="Execuções" value={execStats?.total || 0} />
        <StatCard icon="✅" label="Aprovados" value={execStats?.passed || 0} color="var(--green)" />
        <StatCard icon="❌" label="Falhas" value={execStats?.failed || 0} color="var(--red)" />
        {passRate !== null && (
          <StatCard icon="📊" label="Pass Rate"
            value={`${passRate}%`}
            color={passRate >= 80 ? 'var(--green)' : passRate >= 60 ? '#eab308' : 'var(--red)'} />
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
        {[
          { key: 'overview', label: '👤 Visão Geral' },
          { key: 'squads',   label: `🏢 Squads (${squads.length})` },
          { key: 'security', label: '🔐 Segurança' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all .15s', whiteSpace: 'nowrap',
            color: tab === t.key ? 'var(--blue)' : 'var(--text-muted)',
            borderBottom: tab === t.key ? '2px solid var(--blue)' : '2px solid transparent',
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab Visão Geral */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Informações pessoais */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', marginBottom: 16 }}>
              INFORMAÇÕES DA CONTA
            </div>
            {[
              { label: 'Nome completo', value: profile?.name },
              { label: 'Email',         value: profile?.email },
              { label: 'Perfil',        value: role.label },
              { label: 'Último acesso', value: profile?.last_login_at
                  ? new Date(profile.last_login_at).toLocaleString('pt-BR')
                  : '—' },
              { label: 'Membro desde',  value: profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('pt-BR')
                  : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-pri)', maxWidth: 220, textAlign: 'right', wordBreak: 'break-all' }}>
                  {value || '—'}
                </span>
              </div>
            ))}
          </div>

          {/* Permissões */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', marginBottom: 16 }}>
              PERMISSÕES
            </div>
            {[
              { label: 'Ver relatórios',          allowed: true },
              { label: 'Executar casos de teste', allowed: true },
              { label: 'Criar casos de teste',    allowed: ['admin','manager','qa_engineer'].includes(profile?.role) },
              { label: 'Gerenciar squads',        allowed: ['admin','manager'].includes(profile?.role) },
              { label: 'Gerenciar projetos',      allowed: ['admin','manager'].includes(profile?.role) },
              { label: 'Gerenciar usuários',      allowed: profile?.role === 'admin' },
              { label: 'Configurações do sistema', allowed: profile?.role === 'admin' },
            ].map(({ label, allowed }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>{label}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                  background: allowed ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.1)',
                  color: allowed ? 'var(--green)' : 'var(--text-muted)',
                }}>
                  {allowed ? '✓ Permitido' : '✗ Negado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Squads */}
      {tab === 'squads' && (
        <div>
          {squads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Você não faz parte de nenhuma squad</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Peça a um administrador para te adicionar em uma squad</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {squads.map(s => (
                <div key={s.id} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderLeft: `4px solid ${s.color_hex || '#4f7cff'}`,
                  borderRadius: 12, padding: '16px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: s.color_hex || '#4f7cff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {s.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-pri)', fontSize: 14 }}>{s.name}</div>
                      {s.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.description}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      background: s.squad_role === 'lead' ? 'rgba(168,85,247,0.15)' : 'rgba(100,116,139,0.15)',
                      color: s.squad_role === 'lead' ? '#a855f7' : '#64748b',
                    }}>
                      {s.squad_role === 'lead' ? '⭐ Lead' : '👤 Member'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '3px 0' }}>
                      {s.member_count || 0} membros
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Segurança */}
      {tab === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', marginBottom: 16 }}>
              SESSÃO ATUAL
            </div>
            {[
              { label: 'Método de autenticação', value: authUser?.source === 'keycloak' ? '🔐 SSO Keycloak' : '🔑 Login local' },
              { label: 'Token',                  value: authUser?.source === 'keycloak' ? 'JWT via Keycloak' : 'JWT local' },
              { label: 'Expiração',              value: '8 horas após login' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-pri)' }}>{value}</span>
              </div>
            ))}

            <button className="btn btn-danger btn-sm" onClick={logout}
              style={{ marginTop: 20, width: '100%' }}>
              Encerrar sessão
            </button>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', marginBottom: 16 }}>
              ROLES & ACESSO
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Role principal</div>
              <span style={{
                fontSize: 14, fontWeight: 700, padding: '6px 16px', borderRadius: 20,
                background: role.bg, color: role.color,
              }}>{role.label}</span>
            </div>
            {authUser?.roles?.length > 1 && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Todos os roles</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {authUser.roles.map(r => (
                    <span key={r} style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                      background: 'var(--bg-elevated)', color: 'var(--text-sec)',
                      border: '1px solid var(--border)',
                    }}>{r}</span>
                  ))}
                </div>
              </div>
            )}
            {authUser?.source === 'keycloak' && (
              <div style={{
                marginTop: 16, padding: '12px 14px', borderRadius: 10,
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>
                  🔐 Autenticado via SSO
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Sua conta é gerenciada pelo Keycloak. Para alterar senha ou dados, acesse o painel do Keycloak.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
