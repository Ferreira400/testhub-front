import React, { useEffect, useState, useCallback } from 'react'
import { testCases, projects as projApi } from '../services/api'
import Layout from '../../Layout'

const PB = { critical:'red', high:'orange', medium:'yellow', low:'gray' }
const TB = { manual:'blue', automated:'purple', exploratory:'cyan' }
const SB = { draft:'gray', review:'yellow', approved:'green', deprecated:'red' }

const Badge = ({ text, color }) => <span className={`badge badge-${color}`}>{text}</span>

const Modal = ({ title, onClose, children }) => (
  <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
    <div className="modal">
      <div className="modal-header"><div className="modal-title">{title}</div><button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button></div>
      {children}
    </div>
  </div>
)

export default function TestCases() {
  const [cases,   setCases]   = useState([])
  const [projs,   setProjs]   = useState([])
  const [projId,  setProjId]  = useState('')
  const [loading, setLoad]    = useState(true)
  const [detail,  setDetail]  = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [filter,  setFilter]  = useState({ type:'', priority:'', status:'' })
  const [form,    setForm]    = useState({ title:'', type:'manual', priority:'medium', preconditions:'', automation_status:'not_automated' })
  const [steps,   setSteps]   = useState([{ action:'', expected_result:'' }])

  useEffect(() => {
    projApi.list().then(r => {
      const list = r.data || []; setProjs(list)
      if (list[0]) setProjId(list[0].id)
    })
  }, [])

  const load = useCallback(() => {
    if (!projId) return
    setLoad(true)
    testCases.list({ project_id: projId, ...filter })
      .then(r => setCases(r.data || []))
      .finally(() => setLoad(false))
  }, [projId, filter])

  useEffect(() => { load() }, [load])

  const openDetail = id => testCases.getById(id).then(r => setDetail(r.data))

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await testCases.create({ ...form, project_id: projId, steps: steps.filter(s => s.action.trim()) })
      setShowNew(false); setForm({ title:'', type:'manual', priority:'medium', preconditions:'', automation_status:'not_automated' }); setSteps([{action:'',expected_result:''}]); load()
    } finally { setSaving(false) }
  }

  const remove = async id => {
    if (!confirm('Deprecar este caso?')) return
    await testCases.remove(id); load()
  }

  const updateStep = (i, f, v) => setSteps(steps.map((s,idx) => idx===i ? {...s,[f]:v} : s))

  return (
    <Layout>
      <div className="page-header">
        <div className="page-hrow">
          <div><div className="page-title">Casos de Teste</div><div className="page-sub">{cases.length} casos encontrados</div></div>
          <div className="page-actions">
            <select className="input" style={{width:180}} value={projId} onChange={e=>setProjId(e.target.value)}>
              {projs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={()=>setShowNew(true)}>+ Novo Caso</button>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}>
          {[['type',['','manual','automated','exploratory']],['priority',['','critical','high','medium','low']],['status',['','draft','review','approved']]].map(([key,opts]) => (
            <select key={key} className="input" style={{width:150}} value={filter[key]} onChange={e=>setFilter(f=>({...f,[key]:e.target.value}))}>
              {opts.map(o => <option key={o} value={o}>{o||`Todos (${key})`}</option>)}
            </select>
          ))}
        </div>
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        {loading
          ? <div style={{padding:20}}>{[1,2,3,4,5].map(i=><div key={i} className="skel" style={{height:44,marginBottom:8}}/>)}</div>
          : cases.length === 0
            ? <div className="empty"><div className="empty-icon">◎</div><div>Nenhum caso encontrado</div><button className="btn btn-primary btn-sm" style={{marginTop:12}} onClick={()=>setShowNew(true)}>Criar primeiro caso</button></div>
            : <table className="table">
                <thead><tr><th>Código</th><th>Título</th><th>Tipo</th><th>Prioridade</th><th>Status</th><th>Automação</th><th></th></tr></thead>
                <tbody>
                  {cases.map(c => (
                    <tr key={c.id}>
                      <td><span style={{fontFamily:'monospace',color:'var(--blue)',fontSize:12,fontWeight:600}}>{c.code}</span></td>
                      <td><button style={{background:'none',border:'none',color:'var(--text-pri)',cursor:'pointer',fontSize:13,fontWeight:500,textAlign:'left',padding:0}} onClick={()=>openDetail(c.id)}>{c.title}</button></td>
                      <td><Badge text={c.type}     color={TB[c.type]||'gray'} /></td>
                      <td><Badge text={c.priority} color={PB[c.priority]||'gray'} /></td>
                      <td><Badge text={c.status}   color={SB[c.status]||'gray'} /></td>
                      <td><span style={{fontSize:12,color:c.automation_status==='automated'?'var(--green)':'var(--text-muted)'}}>{c.automation_status==='automated'?'✓ Auto':c.automation_status}</span></td>
                      <td><button className="btn btn-danger btn-xs" onClick={()=>remove(c.id)}>Deprecar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>}
      </div>

      {showNew && (
        <Modal title="Novo Caso de Teste" onClose={()=>setShowNew(false)}>
          <div className="form-group"><label className="form-label">Título *</label><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ex: Login com credenciais inválidas" /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Tipo</label><select className="input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{['manual','automated','exploratory'].map(t=><option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Prioridade</label><select className="input" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{['critical','high','medium','low'].map(p=><option key={p}>{p}</option>)}</select></div>
          </div>
          <div className="form-group"><label className="form-label">Pré-condições</label><textarea className="input" rows={2} value={form.preconditions} onChange={e=>setForm({...form,preconditions:e.target.value})} /></div>
          <div className="divider" />
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <span className="form-label" style={{margin:0}}>Passos</span>
            <button className="btn btn-ghost btn-xs" onClick={()=>setSteps([...steps,{action:'',expected_result:''}])}>+ Adicionar passo</button>
          </div>
          {steps.map((s,i) => (
            <div key={i} style={{background:'var(--bg-base)',border:'1px solid var(--border)',borderRadius:'var(--r-md)',padding:12,marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:11,color:'var(--text-muted)',fontWeight:600}}>PASSO {i+1}</span>{steps.length>1&&<button className="btn btn-ghost btn-xs btn-icon" style={{padding:'2px 6px'}} onClick={()=>setSteps(steps.filter((_,idx)=>idx!==i))}>✕</button>}</div>
              <input className="input" placeholder="Ação a executar" value={s.action} onChange={e=>updateStep(i,'action',e.target.value)} style={{marginBottom:6}} />
              <input className="input" placeholder="Resultado esperado" value={s.expected_result} onChange={e=>updateStep(i,'expected_result',e.target.value)} />
            </div>
          ))}
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={()=>setShowNew(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving||!form.title.trim()}>{saving&&<span className="spinner spinner-sm"/>}{saving?'Salvando…':'Criar Caso'}</button>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal title={`${detail.code} — ${detail.title}`} onClose={()=>setDetail(null)}>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
            <Badge text={detail.type}     color={TB[detail.type]||'gray'} />
            <Badge text={detail.priority} color={PB[detail.priority]||'gray'} />
            <Badge text={detail.status}   color={SB[detail.status]||'gray'} />
          </div>
          {detail.preconditions && <div style={{background:'var(--bg-elevated)',borderRadius:'var(--r-md)',padding:12,marginBottom:16,fontSize:13,color:'var(--text-sec)'}}><strong>Pré-condições:</strong> {detail.preconditions}</div>}
          {detail.steps?.length > 0 && (
            <div>
              <div className="form-label" style={{marginBottom:10}}>Passos ({detail.steps.length})</div>
              {detail.steps.map((s,i) => (
                <div key={s.id} style={{border:'1px solid var(--border)',borderRadius:'var(--r-md)',padding:12,marginBottom:8}}>
                  <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:600,marginBottom:6}}>PASSO {i+1}</div>
                  <div style={{fontSize:13,color:'var(--text-pri)',marginBottom:5}}>{s.action}</div>
                  <div style={{fontSize:12,color:'var(--green)'}}>↳ {s.expected_result}</div>
                </div>
              ))}
            </div>
          )}
          <div className="form-actions"><button className="btn btn-ghost" onClick={()=>setDetail(null)}>Fechar</button></div>
        </Modal>
      )}
    </Layout>
  )
}
