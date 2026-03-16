import React, { useEffect, useState } from 'react'
import { squads as squadsApi, users as usersApi } from '../services/api'
import Layout from '../../Layout'

const PALETTE = ['#4f7cff','#22c55e','#eab308','#f43f5e','#22d3ee','#a855f7','#f97316','#ec4899']

const ROLE_COLORS = {
  admin:       { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444',  label: 'Admin'     },
  manager:     { bg: 'rgba(249,115,22,0.15)',  color: '#f97316',  label: 'Manager'   },
  qa_engineer: { bg: 'rgba(79,124,255,0.15)',  color: '#4f7cff',  label: 'QA Eng'    },
  viewer:      { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8',  label: 'Viewer'    },
  lead:        { bg: 'rgba(168,85,247,0.15)',  color: '#a855f7',  label: 'Lead'      },
  member:      { bg: 'rgba(100,116,139,0.15)', color: '#64748b',  label: 'Member'    },
}

const RoleBadge = ({ role }) => {
  const r = ROLE_COLORS[role] || ROLE_COLORS.member
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: r.bg, color: r.color, letterSpacing: '.04em' }}>
      {r.label}
    </span>
  )
}

const Avatar = ({ name, size = 32, color }) => {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const bg = color || `hsl(${(name || '').charCodeAt(0) * 17 % 360}, 60%, 45%)`
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff', letterSpacing: '-.02em',
    }}>{initials}</div>
  )
}

const Modal = ({ title, onClose, children, width = 480 }) => (
  <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal" style={{ maxWidth: width, borderRadius: 14 }}>
      <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="modal-title" style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  </div>
)

// Card de squad na lista
function SquadCard({ squad, selected, onClick }) {
  const isSelected = selected?.id === squad.id
  return (
    <div onClick={onClick} style={{
      background: 'var(--bg-card)', borderRadius: 12, padding: '14px 16px',
      marginBottom: 8, cursor: 'pointer', transition: 'all .15s',
      border: `1px solid ${isSelected ? squad.color_hex || 'var(--blue)' : 'var(--border)'}`,
      boxShadow: isSelected ? `0 0 0 2px ${(squad.color_hex || '#4f7cff')}33` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: squad.color_hex || '#4f7cff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: '#fff',
        }}>
          {squad.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-pri)', fontSize: 14 }}>{squad.name}</div>
          {squad.description && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {squad.description}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: squad.color_hex || 'var(--blue)' }}>
            {squad.member_count || 0}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.04em' }}>MEMBROS</div>
        </div>
      </div>
    </div>
  )
}

// Painel de detalhes da squad
function SquadDetail({ squad, allUsers, onClose, onRefresh }) {
  const [adding,   setAdding]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [memberId, setMemberId] = useState('')
  const [mRole,    setMRole]    = useState('member')

  const available = allUsers.filter(u => !squad.members?.find(m => m.id === u.id))

  const addMember = async () => {
    if (!memberId) return
    setSaving(true)
    try {
      await squadsApi.addMember(squad.id, { user_id: memberId, squad_role: mRole })
      setAdding(false); setMemberId('')
      onRefresh()
    } finally { setSaving(false) }
  }

  const removeMember = async uid => {
    if (!confirm('Remover este membro da squad?')) return
    await squadsApi.removeMember(squad.id, uid)
    onRefresh()
  }

  const leads   = squad.members?.filter(m => m.squad_role === 'lead') || []
  const members = squad.members?.filter(m => m.squad_role !== 'lead') || []

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>

      {/* Header da squad */}
      <div style={{
        padding: '20px 24px', borderBottom: '1px solid var(--border)',
        background: `linear-gradient(135deg, ${squad.color_hex || '#4f7cff'}22 0%, transparent 60%)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: squad.color_hex || '#4f7cff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: '#fff',
              boxShadow: `0 4px 16px ${squad.color_hex || '#4f7cff'}44`,
            }}>
              {squad.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-pri)', letterSpacing: '-.03em' }}>
                {squad.name}
              </div>
              {squad.description && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                  {squad.description}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}
              style={{ fontSize: 13 }}>+ Membro</button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
          {[
            { label: 'Total', value: squad.members?.length || 0, color: squad.color_hex },
            { label: 'Leads', value: leads.length, color: '#a855f7' },
            { label: 'Membros', value: members.length, color: '#64748b' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color || 'var(--text-pri)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '.04em' }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Membros */}
      <div style={{ padding: '16px 24px' }}>
        {!squad.members?.length ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <div style={{ fontSize: 14 }}>Nenhum membro ainda</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>
              Adicionar primeiro membro
            </button>
          </div>
        ) : (
          <>
            {/* Leads */}
            {leads.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.06em', marginBottom: 10 }}>
                  LEADS
                </div>
                <div style={{ marginBottom: 16 }}>
                  {leads.map(m => <MemberRow key={m.id} member={m} onRemove={removeMember} accentColor={squad.color_hex} />)}
                </div>
              </>
            )}

            {/* Membros */}
            {members.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.06em', marginBottom: 10 }}>
                  MEMBROS
                </div>
                <div>
                  {members.map(m => <MemberRow key={m.id} member={m} onRemove={removeMember} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Modal adicionar membro */}
      {adding && (
        <Modal title={`Adicionar membro — ${squad.name}`} onClose={() => { setAdding(false); setMemberId('') }}>
          <div className="form-group">
            <label className="form-label">Usuário *</label>
            <select className="input" value={memberId} onChange={e => setMemberId(e.target.value)}>
              <option value="">Selecione um usuário…</option>
              {available.map(u => (
                <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
              ))}
            </select>
            {available.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Todos os usuários já fazem parte desta squad.
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Função na Squad</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'member', label: '👤 Member', color: '#64748b' },
                { value: 'lead',   label: '⭐ Lead',   color: '#a855f7' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setMRole(opt.value)} style={{
                  flex: 1, padding: '10px', borderRadius: 10,
                  border: `2px solid ${mRole === opt.value ? opt.color : 'var(--border)'}`,
                  background: mRole === opt.value ? opt.color + '22' : 'transparent',
                  color: mRole === opt.value ? opt.color : 'var(--text-muted)',
                  cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all .15s',
                }}>{opt.label}</button>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => { setAdding(false); setMemberId('') }}>Cancelar</button>
            <button className="btn btn-primary" onClick={addMember} disabled={saving || !memberId}>
              {saving && <span className="spinner spinner-sm" />}Adicionar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function MemberRow({ member, onRemove, accentColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 10, marginBottom: 6,
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      transition: 'border-color .15s',
    }}>
      <Avatar name={member.name} size={36} color={accentColor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-pri)', fontSize: 13 }}>{member.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{member.email}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <RoleBadge role={member.role} />
        <RoleBadge role={member.squad_role} />
        <button className="btn btn-danger btn-xs" onClick={() => onRemove(member.id)}
          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
          Remover
        </button>
      </div>
    </div>
  )
}

// Tela de usuários
function UsersPanel({ users, onRefresh }) {
  const [search, setSearch] = useState('')

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <input className="input" placeholder="🔍 Buscar usuário…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%' }} />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
          <div>Nenhum usuário encontrado</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {filtered.map(u => (
            <div key={u.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <Avatar name={u.name} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-pri)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {u.email}
                </div>
                <div style={{ marginTop: 6 }}>
                  <RoleBadge role={u.role} />
                </div>
              </div>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: u.is_active !== false ? 'var(--green)' : 'var(--red)',
              }} title={u.is_active !== false ? 'Ativo' : 'Inativo'} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Squads() {
  const [list,     setList]     = useState([])
  const [users,    setUsers]    = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoad]     = useState(true)
  const [showCreate, setCreate] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [tab,      setTab]      = useState('squads') // 'squads' | 'users'
  const [form,     setForm]     = useState({ name: '', description: '', color_hex: '#4f7cff' })

  const loadList = () => {
    setLoad(true)
    squadsApi.list().then(r => setList(r.data || [])).finally(() => setLoad(false))
  }

  useEffect(() => {
    loadList()
    usersApi.list().then(r => setUsers(r.data || []))
  }, [])

  const selectSquad = id => squadsApi.getById(id).then(r => setSelected(r.data))

  const refreshSelected = () => {
    if (selected) selectSquad(selected.id)
    loadList()
  }

  const createSquad = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await squadsApi.create(form)
      setCreate(false)
      setForm({ name: '', description: '', color_hex: '#4f7cff' })
      loadList()
    } finally { setSaving(false) }
  }

  return (
    <Layout>
      <div className="page-header">
        <div className="page-hrow">
          <div>
            <div className="page-title">Squads & Usuários</div>
            <div className="page-sub">{list.length} squads · {users.length} usuários</div>
          </div>
          {tab === 'squads' && (
            <button className="btn btn-primary" onClick={() => setCreate(true)}>+ Nova Squad</button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {[
            { key: 'squads', label: '🏢 Squads', count: list.length },
            { key: 'users',  label: '👥 Usuários', count: users.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all .15s',
              color: tab === t.key ? 'var(--blue)' : 'var(--text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--blue)' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {t.label}
              <span style={{
                marginLeft: 6, fontSize: 11, padding: '1px 7px', borderRadius: 20,
                background: tab === t.key ? 'rgba(79,124,255,0.15)' : 'var(--bg-elevated)',
                color: tab === t.key ? 'var(--blue)' : 'var(--text-muted)',
                fontWeight: 700,
              }}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Squads */}
      {tab === 'squads' && (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '300px 1fr' : '1fr', gap: 16, transition: 'grid-template-columns .2s' }}>

          {/* Lista de squads */}
          <div>
            {loading
              ? [1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 76, marginBottom: 8, borderRadius: 12 }} />)
              : list.length === 0
                ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhuma squad criada</div>
                    <div style={{ fontSize: 13, marginBottom: 16 }}>Crie squads para organizar seus times de QA</div>
                    <button className="btn btn-primary btn-sm" onClick={() => setCreate(true)}>+ Criar primeira squad</button>
                  </div>
                )
                : list.map(s => (
                  <SquadCard key={s.id} squad={s} selected={selected}
                    onClick={() => selected?.id === s.id ? setSelected(null) : selectSquad(s.id)} />
                ))
            }
          </div>

          {/* Detalhe da squad */}
          {selected && (
            <SquadDetail
              squad={selected}
              allUsers={users}
              onClose={() => setSelected(null)}
              onRefresh={refreshSelected}
            />
          )}
        </div>
      )}

      {/* Tab Usuários */}
      {tab === 'users' && (
        <UsersPanel users={users} onRefresh={() => usersApi.list().then(r => setUsers(r.data || []))} />
      )}

      {/* Modal criar squad */}
      {showCreate && (
        <Modal title="Nova Squad" onClose={() => setCreate(false)}>
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input className="input" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Squad Pagamentos" />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input className="input" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Área de atuação" />
          </div>
          <div className="form-group">
            <label className="form-label">Cor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PALETTE.map(c => (
                <div key={c} onClick={() => setForm({ ...form, color_hex: c })} style={{
                  width: 34, height: 34, borderRadius: 10, background: c, cursor: 'pointer',
                  border: form.color_hex === c ? '3px solid #fff' : '3px solid transparent',
                  boxShadow: form.color_hex === c ? `0 0 0 2px ${c}` : 'none',
                  transition: 'all .15s', boxSizing: 'border-box',
                }} />
              ))}
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: form.color_hex, flexShrink: 0 }} />
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-pri)' }}>
                {form.name || 'Preview'}
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setCreate(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={createSquad} disabled={saving || !form.name.trim()}>
              {saving && <span className="spinner spinner-sm" />}Criar Squad
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
