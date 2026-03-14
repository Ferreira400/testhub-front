import React, { useEffect, useState, useCallback } from 'react'
import { testCycles, projects as projApi, squads as squadsApi, testCases, users as usersApi } from '../services/api'
import Layout from '../../Layout'

const ST = { planning:'yellow', active:'green', completed:'blue', archived:'gray' }
const Badge = ({ text, color }) => <span className={`badge badge-${color}`}>{text}</span>
const Modal = ({ title, onClose, children }) => (
  <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal"><div className="modal-header"><div className="modal-title">{title}</div><button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button></div>{children}</div>
  </div>
)

export default function Cycles() {
  const [cycles,  setCycles]  = useState([])
  const [projs,   setProjs]   = useState([])
  const [squads,  setSquads]  = useState([])
  const [cases,   setCases]   = useState([])
  const [users,   setUsers]   = useState([])
  const [loading, setLoad]    = useState(true)
  const [selected,setSelected]= useState(null)
  const [showNew, setShowNew] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState({ project_id:'', squad_id:'', name:'', environment:'staging', build_version:'', assigned_to:'', case_ids:[] })

  const load = useCallback(() => {
    setLoad(true)
    testCycles.list().then(r=>setCycles(r.data||[])).finally(()=>setLoad(false))
  },[])

  useEffect(() => {
    load()
    projApi.list().then(r=>{const l=r.data||[];setProjs(l);if(l[0])setForm(f=>({...f,project_id:l[0].id}))})
    squadsApi.list().then(r=>{const l=r.data||[];setSquads(l);if(l[0])setForm(f=>({...f,squad_id:l[0].id}))})
    usersApi.list().then(r=>setUsers(r.data||[]))
  },[load])

  useEffect(()=>{
    if(form.project_id) testCases.list({project_id:form.project_id}).then(r=>setCases(r.data||[]))
  },[form.project_id])

  const selectCycle = id => testCycles.getById(id).then(r=>setSelected(r.data))

  const save = async () => {
    if (!form.name.trim()||!form.project_id||!form.squad_id) return
    setSaving(true)
    try { await testCycles.create(form); setShowNew(false); load() } finally { setSaving(false) }
  }

  const toggleCase = id => setForm(f=>({...f,case_ids:f.case_ids.includes(id)?f.case_ids.filter(x=>x!==id):[...f.case_ids,id]}))

  return (
    <Layout>
      <div className="page-header">
        <div className="page-hrow">
          <div><div className="page-title">Ciclos de Teste</div><div className="page-sub">{cycles.length} ciclos</div></div>
          <button className="btn btn-primary" onClick={()=>setShowNew(true)}>+ Novo Ciclo</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:selected?'340px 1fr':'1fr',gap:18,transition:'grid-template-columns .25s'}}>
        <div>
          {loading ? [1,2,3].map(i=><div key={i} className="skel" style={{height:90,marginBottom:12,borderRadius:20}}/>) :
          cycles.length===0 ? <div className="empty"><div className="empty-icon">↻</div>Nenhum ciclo criado</div> :
          cycles.map(c=>(
            <div key={c.id} className="card" style={{marginBottom:12,cursor:'pointer',borderColor:selected?.id===c.id?'var(--blue)':undefined,transition:'border-color .2s'}} onClick={()=>selectCycle(c.id)}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                <div style={{fontWeight:600,color:'var(--text-pri)',fontSize:14}}>{c.name}</div>
                <Badge text={c.status||'planning'} color={ST[c.status||'planning']||'gray'} />
              </div>
              <div style={{display:'flex',gap:12,marginTop:8,fontSize:12,color:'var(--text-muted)'}}>
                {c.environment&&<span>🌐 {c.environment}</span>}
                {c.build_version&&<span>📦 {c.build_version}</span>}
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="card fade-up">
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:'var(--text-pri)',letterSpacing:'-.02em'}}>{selected.name}</div>
                <div style={{display:'flex',gap:8,marginTop:6,flexWrap:'wrap'}}>
                  {selected.environment&&<span className="badge badge-cyan">{selected.environment}</span>}
                  {selected.build_version&&<span className="badge badge-purple">{selected.build_version}</span>}
                  <Badge text={selected.status||'planning'} color={ST[selected.status||'planning']||'gray'} />
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setSelected(null)}>✕</button>
            </div>

            <div className="form-label" style={{marginBottom:10}}>Casos de Teste ({selected.cases?.length||0})</div>
            {!selected.cases?.length
              ? <div className="empty" style={{padding:'24px 0'}}><div className="empty-icon">◎</div>Sem casos neste ciclo</div>
              : <table className="table">
                  <thead><tr><th>Código</th><th>Título</th><th>Tipo</th><th>Status</th></tr></thead>
                  <tbody>
                    {selected.cases?.map(c=>(
                      <tr key={c.id}>
                        <td><span style={{fontFamily:'monospace',color:'var(--blue)',fontSize:12,fontWeight:600}}>{c.code}</span></td>
                        <td style={{color:'var(--text-pri)',fontWeight:500}}>{c.title}</td>
                        <td><Badge text={c.type} color={c.type==='manual'?'blue':'purple'} /></td>
                        <td><Badge text={c.execution_status||'not_run'} color={c.execution_status==='passed'?'green':c.execution_status==='failed'?'red':'gray'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
          </div>
        )}
      </div>

      {showNew && (
        <Modal title="Novo Ciclo de Teste" onClose={()=>setShowNew(false)}>
          <div className="form-group"><label className="form-label">Nome *</label><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex: Sprint 16 - Regressão" /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Projeto *</label>
              <select className="input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}>
                {projs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Squad *</label>
              <select className="input" value={form.squad_id} onChange={e=>setForm({...form,squad_id:e.target.value})}>
                {squads.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Ambiente</label>
              <select className="input" value={form.environment} onChange={e=>setForm({...form,environment:e.target.value})}>
                {['staging','production','development','homologation'].map(e=><option key={e}>{e}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Versão/Build</label><input className="input" value={form.build_version} onChange={e=>setForm({...form,build_version:e.target.value})} placeholder="v2.1.0" /></div>
          </div>
          <div className="form-group"><label className="form-label">Responsável</label>
            <select className="input" value={form.assigned_to} onChange={e=>setForm({...form,assigned_to:e.target.value})}>
              <option value="">Nenhum</option>
              {users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select></div>
          {cases.length>0 && (
            <div className="form-group">
              <label className="form-label">Casos de Teste ({form.case_ids.length} selecionados)</label>
              <div style={{maxHeight:180,overflowY:'auto',background:'var(--bg-base)',borderRadius:'var(--r-md)',border:'1px solid var(--border)',padding:8}}>
                {cases.map(c=>(
                  <label key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 8px',cursor:'pointer',borderRadius:6,transition:'background .15s'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <input type="checkbox" checked={form.case_ids.includes(c.id)} onChange={()=>toggleCase(c.id)} />
                    <span style={{fontSize:11,fontFamily:'monospace',color:'var(--blue)'}}>{c.code}</span>
                    <span style={{fontSize:13,color:'var(--text-sec)'}}>{c.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={()=>setShowNew(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving||!form.name.trim()}>{saving&&<span className="spinner spinner-sm"/>}Criar Ciclo</button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
