import React, { useEffect, useState } from 'react'
import { squads as squadsApi, users as usersApi } from '../services/api'
import Layout from '../../Layout'

const PALETTE = ['#4f7cff','#22c55e','#eab308','#f43f5e','#22d3ee','#a855f7','#f97316']

const Modal = ({ title, onClose, children }) => (
  <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal">
      <div className="modal-header"><div className="modal-title">{title}</div><button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button></div>
      {children}
    </div>
  </div>
)

export default function Squads() {
  const [list,     setList]     = useState([])
  const [users,    setUsers]    = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoad]     = useState(true)
  const [showCreate, setCreate] = useState(false)
  const [showMember, setMember] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form,     setForm]     = useState({ name:'', description:'', color_hex:'#4f7cff' })
  const [memberId, setMemberId] = useState('')
  const [mRole,    setMRole]    = useState('member')

  const loadList = () => { setLoad(true); squadsApi.list().then(r => setList(r.data||[])).finally(()=>setLoad(false)) }
  useEffect(() => { loadList(); usersApi.list().then(r=>setUsers(r.data||[])) }, [])

  const selectSquad = id => squadsApi.getById(id).then(r=>setSelected(r.data))

  const createSquad = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try { await squadsApi.create(form); setCreate(false); setForm({name:'',description:'',color_hex:'#4f7cff'}); loadList() }
    finally { setSaving(false) }
  }

  const addMember = async () => {
    if (!memberId || !selected) return
    setSaving(true)
    try { await squadsApi.addMember(selected.id, {user_id:memberId,squad_role:mRole}); selectSquad(selected.id); setMember(false); setMemberId('') }
    finally { setSaving(false) }
  }

  const removeMember = async uid => {
    if (!confirm('Remover membro?')) return
    await squadsApi.removeMember(selected.id, uid); selectSquad(selected.id)
  }

  return (
    <Layout>
      <div className="page-header">
        <div className="page-hrow">
          <div><div className="page-title">Squads</div><div className="page-sub">{list.length} squads ativas</div></div>
          <button className="btn btn-primary" onClick={()=>setCreate(true)}>+ Nova Squad</button>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns: selected ? '280px 1fr' : '1fr', gap:18, transition:'grid-template-columns .25s'}}>
        <div>
          {loading ? [1,2,3].map(i=><div key={i} className="skel" style={{height:82,marginBottom:12,borderRadius:20}}/>)
          : list.length === 0
            ? <div className="empty"><div className="empty-icon">◈</div>Nenhuma squad criada</div>
            : list.map(s => (
              <div key={s.id} className="card" style={{marginBottom:12,cursor:'pointer',borderColor:selected?.id===s.id?'var(--blue)':undefined,transition:'border-color .2s'}} onClick={()=>selectSquad(s.id)}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:38,height:38,borderRadius:10,background:s.color_hex||'#4f7cff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-serif)',fontSize:18,color:'#fff',flexShrink:0}}>{s.name?.[0]}</div>
                  <div>
                    <div style={{fontWeight:600,color:'var(--text-pri)',fontSize:14}}>{s.name}</div>
                    <div style={{fontSize:12,color:'var(--text-muted)',marginTop:1}}>{s.member_count||0} membro{s.member_count!==1?'s':''}</div>
                  </div>
                </div>
                {s.description&&<div style={{fontSize:12,color:'var(--text-muted)',marginTop:8}}>{s.description}</div>}
              </div>
          ))}
        </div>

        {selected && (
          <div className="card fade-up">
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:selected.color_hex||'#4f7cff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-serif)',fontSize:22,color:'#fff'}}>{selected.name?.[0]}</div>
                <div>
                  <div style={{fontSize:18,fontWeight:700,color:'var(--text-pri)',letterSpacing:'-.02em'}}>{selected.name}</div>
                  <div style={{fontSize:12.5,color:'var(--text-muted)',marginTop:2}}>{selected.description}</div>
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>setMember(true)}>+ Membro</button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setSelected(null)}>✕</button>
              </div>
            </div>

            {!selected.members?.length
              ? <div className="empty" style={{padding:'28px 0'}}><div className="empty-icon">◈</div>Sem membros ainda</div>
              : <table className="table">
                  <thead><tr><th>Membro</th><th>Role</th><th>Função Squad</th><th></th></tr></thead>
                  <tbody>
                    {selected.members?.map(m => (
                      <tr key={m.id}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:9}}>
                            <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,var(--blue),var(--purple))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',flexShrink:0}}>{m.name?.[0]?.toUpperCase()}</div>
                            <div><div style={{fontWeight:500,color:'var(--text-pri)',fontSize:13}}>{m.name}</div><div style={{fontSize:11,color:'var(--text-muted)'}}>{m.email}</div></div>
                          </div>
                        </td>
                        <td><span className="badge badge-gray">{m.role}</span></td>
                        <td><span className={`badge ${m.squad_role==='lead'?'badge-blue':'badge-gray'}`}>{m.squad_role}</span></td>
                        <td><button className="btn btn-danger btn-xs" onClick={()=>removeMember(m.id)}>Remover</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="Nova Squad" onClose={()=>setCreate(false)}>
          <div className="form-group"><label className="form-label">Nome *</label><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex: Squad Alpha" /></div>
          <div className="form-group"><label className="form-label">Descrição</label><input className="input" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Área de atuação" /></div>
          <div className="form-group">
            <label className="form-label">Cor</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {PALETTE.map(c=><div key={c} onClick={()=>setForm({...form,color_hex:c})} style={{width:30,height:30,borderRadius:8,background:c,cursor:'pointer',border:form.color_hex===c?'3px solid #fff':'3px solid transparent',transition:'.15s',boxSizing:'border-box'}} />)}
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={()=>setCreate(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={createSquad} disabled={saving||!form.name.trim()}>{saving&&<span className="spinner spinner-sm"/>}Criar Squad</button>
          </div>
        </Modal>
      )}

      {showMember && (
        <Modal title="Adicionar Membro" onClose={()=>setMember(false)}>
          <div className="form-group"><label className="form-label">Usuário</label>
            <select className="input" value={memberId} onChange={e=>setMemberId(e.target.value)}>
              <option value="">Selecione um usuário…</option>
              {users.filter(u=>!selected?.members?.find(m=>m.id===u.id)).map(u=><option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Função</label>
            <select className="input" value={mRole} onChange={e=>setMRole(e.target.value)}>
              <option value="member">Member</option><option value="lead">Lead</option>
            </select></div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={()=>setMember(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={addMember} disabled={saving||!memberId}>{saving&&<span className="spinner spinner-sm"/>}Adicionar</button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
