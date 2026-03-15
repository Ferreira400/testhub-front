import React, { useEffect, useState, useCallback } from 'react'
import { testCases, projects as projApi } from '../services/api'
import Layout from '../../Layout'

const PB = { critical:'red', high:'orange', medium:'yellow', low:'gray' }
const TB = { manual:'blue', automated:'purple', exploratory:'cyan' }
const SB = { draft:'gray', review:'yellow', approved:'green', deprecated:'red' }

const Badge = ({ text, color }) => <span className={`badge badge-${color}`}>{text}</span>

const Modal = ({ title, onClose, children, wide }) => (
  <div
    className="overlay"
    onClick={e => e.target === e.currentTarget && onClose()}
    style={{ alignItems: 'center', justifyContent: 'center', padding: '24px' }}
  >
    <div className="modal" style={{
      maxWidth: wide ? 860 : 600,
      width: '100%',
      maxHeight: '85vh',
      display: 'flex',
      flexDirection: 'column',
      margin: 'auto',
      borderRadius: 12,
    }}>
      {/* Header fixo */}
      <div className="modal-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        <div className="modal-title" style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} style={{ fontSize: 16 }}>✕</button>
      </div>
      {/* Body com scroll */}
      <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
        {children}
      </div>
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
  const [activeTab, setActiveTab] = useState('steps') // 'steps' | 'gherkin'

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

  const openDetail = id => {
    setActiveTab('steps')
    testCases.getById(id).then(r => setDetail(r.data))
  }

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await testCases.create({ ...form, project_id: projId, steps: steps.filter(s => s.action.trim()) })
      setShowNew(false)
      setForm({ title:'', type:'manual', priority:'medium', preconditions:'', automation_status:'not_automated' })
      setSteps([{ action:'', expected_result:'' }])
      load()
    } finally { setSaving(false) }
  }

  const remove = async id => {
    if (!confirm('Deprecar este caso?')) return
    await testCases.remove(id); load()
  }

  const updateStep = (i, f, v) => setSteps(steps.map((s,idx) => idx===i ? {...s,[f]:v} : s))

  // Extrai Gherkin da description (salvo como gherkin_text)
  const extractGherkin = (description) => {
    if (!description) return null
    // Tenta extrair a parte Feature: do description
    const match = description.match(/(Feature:[\s\S]+)/)
    return match ? match[1].trim() : description.trim()
  }

  return (
    <Layout>
      <div className="page-header">
        <div className="page-hrow">
          <div>
            <div className="page-title">Casos de Teste</div>
            <div className="page-sub">{cases.length} casos encontrados</div>
          </div>
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
            ? <div className="empty">
                <div className="empty-icon">◎</div>
                <div>Nenhum caso encontrado</div>
                <button className="btn btn-primary btn-sm" style={{marginTop:12}} onClick={()=>setShowNew(true)}>Criar primeiro caso</button>
              </div>
            : <table className="table">
                <thead>
                  <tr>
                    <th style={{width:100}}>Código</th>
                    <th>Título</th>
                    <th style={{width:80}}>Jira</th>
                    <th>Tipo</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Automação</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => (
                    <tr key={c.id}>
                      <td>
                        <span style={{fontFamily:'monospace',color:'var(--blue)',fontSize:12,fontWeight:600}}>
                          {c.code || <span style={{color:'var(--text-muted)',fontStyle:'italic'}}>—</span>}
                        </span>
                      </td>
                      <td>
                        <button
                          style={{background:'none',border:'none',color:'var(--text-pri)',cursor:'pointer',fontSize:13,fontWeight:500,textAlign:'left',padding:0}}
                          onClick={()=>openDetail(c.id)}
                        >
                          {c.title}
                        </button>
                      </td>
                      <td>
                        {c.jira_key
                          ? <a href={`${import.meta.env.VITE_JIRA_URL}/browse/${c.jira_key}`} target="_blank" rel="noopener noreferrer"
                              style={{color:'var(--accent)',fontWeight:600,fontSize:12,textDecoration:'none'}}>
                              {c.jira_key}
                            </a>
                          : <span style={{color:'var(--text-muted)',fontSize:12}}>—</span>}
                      </td>
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

      {/* Modal Novo Caso */}
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
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:11,color:'var(--text-muted)',fontWeight:600}}>PASSO {i+1}</span>
                {steps.length>1 && <button className="btn btn-ghost btn-xs btn-icon" style={{padding:'2px 6px'}} onClick={()=>setSteps(steps.filter((_,idx)=>idx!==i))}>✕</button>}
              </div>
              <input className="input" placeholder="Ação a executar" value={s.action} onChange={e=>updateStep(i,'action',e.target.value)} style={{marginBottom:6}} />
              <input className="input" placeholder="Resultado esperado" value={s.expected_result} onChange={e=>updateStep(i,'expected_result',e.target.value)} />
            </div>
          ))}
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={()=>setShowNew(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving||!form.title.trim()}>
              {saving && <span className="spinner spinner-sm"/>}{saving?'Salvando…':'Criar Caso'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Detalhe */}
      {detail && (
        <Modal title={`${detail.code ? detail.code + ' — ' : ''}${detail.title}`} onClose={()=>setDetail(null)} wide>
          {/* Badges */}
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
            <Badge text={detail.type}     color={TB[detail.type]||'gray'} />
            <Badge text={detail.priority} color={PB[detail.priority]||'gray'} />
            <Badge text={detail.status}   color={SB[detail.status]||'gray'} />
            {detail.jira_key && (
              <a href={`${import.meta.env.VITE_JIRA_URL}/browse/${detail.jira_key}`} target="_blank" rel="noopener noreferrer"
                style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 10px',borderRadius:20,background:'rgba(99,102,241,0.15)',color:'var(--accent)',fontSize:12,fontWeight:600,textDecoration:'none'}}>
                🔗 {detail.jira_key}
              </a>
            )}
          </div>

          {/* Pré-condições */}
          {detail.preconditions && (
            <div style={{background:'var(--bg-elevated)',borderRadius:'var(--r-md)',padding:12,marginBottom:16,fontSize:13,color:'var(--text-sec)'}}>
              <strong>Pré-condições:</strong> {detail.preconditions}
            </div>
          )}

          {/* Tabs */}
          <div style={{display:'flex',gap:0,marginBottom:16,borderBottom:'1px solid var(--border)'}}>
            {['steps','gherkin'].map(tab => (
              <button key={tab} onClick={()=>setActiveTab(tab)} style={{
                padding:'8px 18px', background:'none', border:'none', cursor:'pointer',
                fontSize:13, fontWeight:600,
                color: activeTab===tab ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: activeTab===tab ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom:-1,
              }}>
                {tab === 'steps' ? `📋 Passos (${detail.steps?.length||0})` : '🥒 Gherkin'}
              </button>
            ))}
          </div>

          {/* Tab Passos */}
          {activeTab === 'steps' && (
            detail.steps?.length > 0
              ? detail.steps.map((s,i) => (
                  <div key={s.id} style={{border:'1px solid var(--border)',borderRadius:'var(--r-md)',padding:12,marginBottom:8}}>
                    <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:600,marginBottom:6}}>PASSO {i+1}</div>
                    <div style={{fontSize:13,color:'var(--text-pri)',marginBottom:5}}>{s.action}</div>
                    {s.expected_result && <div style={{fontSize:12,color:'var(--green)'}}>↳ {s.expected_result}</div>}
                  </div>
                ))
              : <div style={{color:'var(--text-muted)',fontSize:13,padding:'20px 0',textAlign:'center'}}>Nenhum passo cadastrado</div>
          )}

          {/* Tab Gherkin */}
          {activeTab === 'gherkin' && (() => {
            const gherkin = extractGherkin(detail.description)
            return gherkin
              ? <div>
                  <pre style={{
                    background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:8,
                    padding:16, fontSize:12, color:'var(--text-sec)', overflowX:'auto',
                    whiteSpace:'pre-wrap', lineHeight:1.7,
                  }}>
                    {gherkin}
                  </pre>
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>navigator.clipboard.writeText(gherkin)}>
                      📋 Copiar Gherkin
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={()=>{
                      const blob = new Blob([gherkin],{type:'text/plain'})
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(blob)
                      a.download = `${detail.code||detail.title}.feature`
                      a.click()
                    }}>
                      ⬇️ Baixar .feature
                    </button>
                  </div>
                </div>
              : <div style={{color:'var(--text-muted)',fontSize:13,padding:'20px 0',textAlign:'center'}}>
                  Nenhum cenário Gherkin associado a este caso.<br/>
                  <span style={{fontSize:12}}>Gere via integração Jira para associar automaticamente.</span>
                </div>
          })()}

          <div className="form-actions" style={{marginTop:20}}>
            <button className="btn btn-ghost" onClick={()=>setDetail(null)}>Fechar</button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
