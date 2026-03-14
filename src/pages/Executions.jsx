import React, { useEffect, useState, useCallback } from 'react'
import { executions as execApi, testCycles, testCases, squads as squadsApi, users as usersApi } from '../services/api'
import Layout from '../../Layout'

const ST = { passed:'green', failed:'red', blocked:'yellow', skipped:'purple', in_progress:'cyan', not_run:'gray' }
const Badge = ({ text, color }) => <span className={`badge badge-${color}`}>{text}</span>
const Modal = ({ title, onClose, children }) => (
  <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal"><div className="modal-header"><div className="modal-title">{title}</div><button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button></div>{children}</div>
  </div>
)

export default function Executions() {
  const [list,    setList]    = useState([])
  const [cycles,  setCycles]  = useState([])
  const [cases,   setCases]   = useState([])
  const [squads,  setSquads]  = useState([])
  const [users,   setUsers]   = useState([])
  const [loading, setLoad]    = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [detail,  setDetail]  = useState(null)
  const [filter,  setFilter]  = useState({ cycle_id:'', squad_id:'', status:'' })
  const [form,    setForm]    = useState({ cycle_id:'', test_case_id:'', squad_id:'', status:'passed', execution_type:'manual', duration_seconds:'', comments:'' })

  const load = useCallback(() => {
    setLoad(true)
    execApi.list(filter).then(r=>setList(r.data||[])).finally(()=>setLoad(false))
  },[filter])

  useEffect(() => {
    load()
    testCycles.list().then(r=>setCycles(r.data||[]))
    squadsApi.list().then(r=>setSquads(r.data||[]))
    usersApi.list().then(r=>setUsers(r.data||[]))
  },[load])

  useEffect(()=>{
    if(form.cycle_id) testCycles.getById(form.cycle_id).then(r=>{
      const c = r.data; if(c?.cases) setCases(c.cases)
    })
  },[form.cycle_id])

  const save = async () => {
    if(!form.cycle_id||!form.test_case_id||!form.squad_id) return
    setSaving(true)
    try { await execApi.create({...form,duration_seconds:form.duration_seconds?Number(form.duration_seconds):null}); setShowNew(false); load() } finally { setSaving(false) }
  }

  const openDetail = id => execApi.getById(id).then(r=>setDetail(r.data))

  const formatDate = d => d ? new Date(d).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}) : '—'
  const formatDur  = s => { if(!s) return '—'; if(s<60) return `${s}s`; return `${Math.floor(s/60)}m ${s%60}s` }

  return (
    <Layout>
      <div className="page-header">
        <div className="page-hrow">
          <div><div className="page-title">Execuções</div><div className="page-sub">{list.length} execuções</div></div>
          <button className="btn btn-primary" onClick={()=>setShowNew(true)}>+ Registrar Execução</button>
        </div>
        <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}>
          <select className="input" style={{width:200}} value={filter.cycle_id} onChange={e=>setFilter(f=>({...f,cycle_id:e.target.value}))}>
            <option value="">Todos os ciclos</option>{cycles.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input" style={{width:160}} value={filter.squad_id} onChange={e=>setFilter(f=>({...f,squad_id:e.target.value}))}>
            <option value="">Todas as squads</option>{squads.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" style={{width:140}} value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
            <option value="">Todos status</option>{['passed','failed','blocked','skipped','in_progress','not_run'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        {loading ? <div style={{padding:20}}>{[1,2,3,4,5].map(i=><div key={i} className="skel" style={{height:44,marginBottom:8}}/>)}</div>
        : list.length===0 ? <div className="empty"><div className="empty-icon">▶</div>Nenhuma execução encontrada</div>
        : <table className="table">
            <thead><tr><th>Caso</th><th>Status</th><th>Tipo</th><th>Duração</th><th>Executado por</th><th>Data</th><th></th></tr></thead>
            <tbody>
              {list.map(e=>(
                <tr key={e.id}>
                  <td><div style={{fontWeight:500,color:'var(--text-pri)',fontSize:13}}>{e.test_case_title||e.test_case_id?.slice(0,8)}</div><div style={{fontSize:11,color:'var(--text-muted)',fontFamily:'monospace'}}>{e.test_case_code}</div></td>
                  <td><Badge text={e.status} color={ST[e.status]||'gray'} /></td>
                  <td><span style={{fontSize:12,color:'var(--text-sec)'}}>{e.execution_type}</span></td>
                  <td><span style={{fontSize:12,color:'var(--text-sec)',fontFamily:'monospace'}}>{formatDur(e.duration_seconds)}</span></td>
                  <td><span style={{fontSize:13,color:'var(--text-sec)'}}>{e.executed_by_name||'—'}</span></td>
                  <td><span style={{fontSize:12,color:'var(--text-muted)'}}>{formatDate(e.executed_at)}</span></td>
                  <td><button className="btn btn-ghost btn-xs" onClick={()=>openDetail(e.id)}>Ver</button></td>
                </tr>
              ))}
            </tbody>
          </table>}
      </div>

      {showNew && (
        <Modal title="Registrar Execução" onClose={()=>setShowNew(false)}>
          <div className="form-group"><label className="form-label">Ciclo *</label>
            <select className="input" value={form.cycle_id} onChange={e=>setForm({...form,cycle_id:e.target.value,test_case_id:''})}>
              <option value="">Selecione um ciclo…</option>{cycles.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Caso de Teste *</label>
            <select className="input" value={form.test_case_id} onChange={e=>setForm({...form,test_case_id:e.target.value})}>
              <option value="">Selecione um caso…</option>{cases.map(c=><option key={c.id} value={c.id||c.test_case_id}>{c.code} — {c.title}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Squad *</label>
            <select className="input" value={form.squad_id} onChange={e=>setForm({...form,squad_id:e.target.value})}>
              <option value="">Selecione…</option>{squads.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Status *</label>
              <select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                {['passed','failed','blocked','skipped','in_progress','not_run'].map(s=><option key={s}>{s}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Tipo</label>
              <select className="input" value={form.execution_type} onChange={e=>setForm({...form,execution_type:e.target.value})}>
                <option value="manual">Manual</option><option value="automated">Automatizado</option>
              </select></div>
          </div>
          <div className="form-group"><label className="form-label">Duração (segundos)</label><input className="input" type="number" value={form.duration_seconds} onChange={e=>setForm({...form,duration_seconds:e.target.value})} placeholder="120" /></div>
          <div className="form-group"><label className="form-label">Comentários</label><textarea className="input" rows={3} value={form.comments} onChange={e=>setForm({...form,comments:e.target.value})} placeholder="Observações sobre a execução…" /></div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={()=>setShowNew(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving||!form.cycle_id||!form.test_case_id||!form.squad_id}>{saving&&<span className="spinner spinner-sm"/>}Registrar</button>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal title="Detalhes da Execução" onClose={()=>setDetail(null)}>
          <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
            <Badge text={detail.status} color={ST[detail.status]||'gray'} />
            <Badge text={detail.execution_type} color="blue" />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
            {[['Caso',detail.test_case_title||detail.test_case_id?.slice(0,16)+'…'],['Duração',formatDur(detail.duration_seconds)],['Executado por',detail.executed_by_name||'—'],['Data',formatDate(detail.executed_at)]].map(([l,v])=>(
              <div key={l}><div className="form-label">{l}</div><div style={{fontSize:13,color:'var(--text-pri)',fontWeight:500}}>{v}</div></div>
            ))}
          </div>
          {detail.comments&&<div style={{background:'var(--bg-elevated)',borderRadius:'var(--r-md)',padding:12,fontSize:13,color:'var(--text-sec)'}}><div className="form-label" style={{marginBottom:6}}>Comentários</div>{detail.comments}</div>}
          <div className="form-actions"><button className="btn btn-ghost" onClick={()=>setDetail(null)}>Fechar</button></div>
        </Modal>
      )}
    </Layout>
  )
}
