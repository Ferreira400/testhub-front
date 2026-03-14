import React, { useEffect, useState } from 'react'
import { projects as projApi, squads as squadsApi } from '../services/api'
import Layout from '../../Layout'

const Modal = ({ title, onClose, children }) => (
  <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal"><div className="modal-header"><div className="modal-title">{title}</div><button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button></div>{children}</div>
  </div>
)

export default function Projects() {
  const [list,    setList]    = useState([])
  const [squads,  setSquads]  = useState([])
  const [loading, setLoad]    = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState({ squad_id:'', name:'', key:'', description:'', repository_url:'', jira_project_key:'' })

  const load = () => { setLoad(true); projApi.list().then(r=>setList(r.data||[])).finally(()=>setLoad(false)) }
  useEffect(() => { load(); squadsApi.list().then(r=>{const s=r.data||[];setSquads(s);if(s[0])setForm(f=>({...f,squad_id:s[0].id}))}) }, [])

  const save = async () => {
    if (!form.name.trim()||!form.squad_id) return
    setSaving(true)
    try { await projApi.create(form); setShowNew(false); load() } finally { setSaving(false) }
  }

  const STATUS = { active:'green', archived:'gray', paused:'yellow' }

  return (
    <Layout>
      <div className="page-header">
        <div className="page-hrow">
          <div><div className="page-title">Projetos</div><div className="page-sub">{list.length} projetos</div></div>
          <button className="btn btn-primary" onClick={()=>setShowNew(true)}>+ Novo Projeto</button>
        </div>
      </div>

      {loading
        ? <div className="grid-3 stagger">{[1,2,3].map(i=><div key={i} className="skel" style={{height:140,borderRadius:20}}/>)}</div>
        : list.length === 0
          ? <div className="empty"><div className="empty-icon">▣</div>Nenhum projeto criado</div>
          : <div className="grid-3 stagger">
              {list.map(p => (
                <div key={p.id} className="card fade-up" style={{display:'flex',flexDirection:'column',gap:10}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,color:'var(--text-pri)',letterSpacing:'-.01em'}}>{p.name}</div>
                      <div style={{fontSize:11.5,color:'var(--text-muted)',marginTop:3}}>{p.squad_name}</div>
                    </div>
                    <span className="badge badge-gray" style={{fontFamily:'monospace',fontSize:11}}>{p.key}</span>
                  </div>
                  {p.description && <div style={{fontSize:12.5,color:'var(--text-sec)',lineHeight:1.5}}>{p.description}</div>}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'auto',paddingTop:8,borderTop:'1px solid var(--border)'}}>
                    <span className={`badge badge-${STATUS[p.status]||'gray'}`}>{p.status}</span>
                    <span style={{fontSize:12,color:'var(--text-muted)'}}>{p.total_cases||0} casos</span>
                  </div>
                </div>
              ))}
            </div>}

      {showNew && (
        <Modal title="Novo Projeto" onClose={()=>setShowNew(false)}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nome *</label><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Portal Web" /></div>
            <div className="form-group"><label className="form-label">Chave *</label><input className="input" value={form.key} onChange={e=>setForm({...form,key:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')})} placeholder="PW" maxLength={6} /></div>
          </div>
          <div className="form-group"><label className="form-label">Squad *</label>
            <select className="input" value={form.squad_id} onChange={e=>setForm({...form,squad_id:e.target.value})}>
              {squads.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Descrição</label><textarea className="input" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Repositório</label><input className="input" value={form.repository_url} onChange={e=>setForm({...form,repository_url:e.target.value})} placeholder="https://github.com/..." /></div>
            <div className="form-group"><label className="form-label">Chave Jira</label><input className="input" value={form.jira_project_key} onChange={e=>setForm({...form,jira_project_key:e.target.value})} placeholder="PROJ-001" /></div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={()=>setShowNew(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving||!form.name.trim()||!form.squad_id}>{saving&&<span className="spinner spinner-sm"/>}Criar Projeto</button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
