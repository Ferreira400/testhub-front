import React, { useEffect, useState, useCallback } from 'react'
import { executions as execApi, testCycles, squads as squadsApi, users as usersApi } from '../services/api'
import Layout from '../../Layout'

const ST = { passed:'green', failed:'red', blocked:'yellow', skipped:'purple', in_progress:'cyan', not_run:'gray' }
const ST_ICON = { passed:'✅', failed:'❌', blocked:'⚠️', skipped:'⏭️', in_progress:'🔄', not_run:'⬜' }
const Badge = ({ text, color }) => <span className={`badge badge-${color}`}>{text}</span>

const Modal = ({ title, onClose, children }) => (
  <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal" style={{maxWidth:520,borderRadius:12}}>
      <div className="modal-header" style={{padding:'16px 20px',borderBottom:'1px solid var(--border)'}}>
        <div className="modal-title">{title}</div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
      </div>
      <div style={{padding:20}}>{children}</div>
    </div>
  </div>
)

// Agrupa execuções por test_case_id
function groupByCase(list) {
  const map = {}
  for (const e of list) {
    const key = e.test_case_id || e.id
    if (!map[key]) map[key] = { case_id: key, case_title: e.test_case_title, case_code: e.test_case_code, executions: [] }
    map[key].executions.push(e)
  }
  // Ordena por data mais recente dentro de cada grupo
  for (const key of Object.keys(map)) {
    map[key].executions.sort((a,b) => new Date(b.executed_at||b.started_at) - new Date(a.executed_at||a.started_at))
  }
  return Object.values(map)
}

// Card de grupo de execuções
function CaseGroup({ group, onRetest, onDetail }) {
  const [expanded, setExpanded] = useState(false)
  const latest    = group.executions[0]
  const hasRetest = group.executions.some(e => e.status === 'not_run' && e.retest_reason)
  const hasFailed = group.executions.some(e => e.status === 'failed')
  const retestExec= group.executions.find(e => e.status === 'not_run' && e.retest_reason)

  const formatDate = d => d ? new Date(d).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}) : '—'
  const formatDur  = s => { if(!s) return '—'; if(s<60) return `${s}s`; return `${Math.floor(s/60)}m ${s%60}s` }

  return (
    <div style={{
      background:'var(--bg-card)', border:'1px solid var(--border)',
      borderLeft: hasFailed && hasRetest ? '4px solid var(--purple)'
                : hasFailed ? '4px solid var(--red)'
                : latest?.status === 'passed' ? '4px solid var(--green)'
                : '4px solid var(--border)',
      borderRadius:10, marginBottom:10, overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer'}}
           onClick={() => setExpanded(e=>!e)}>
        <span style={{fontSize:18}}>{ST_ICON[latest?.status]||'⬜'}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,color:'var(--text-pri)',fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {group.case_title || '—'}
          </div>
          <div style={{display:'flex',gap:8,marginTop:2,alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontFamily:'monospace',color:'var(--blue)',fontSize:11}}>{group.case_code}</span>
            <span style={{fontSize:11,color:'var(--text-muted)'}}>{group.executions.length} execução{group.executions.length!==1?'s':''}</span>
            {latest?.executed_by_name && <span style={{fontSize:11,color:'var(--text-muted)'}}>por {latest.executed_by_name}</span>}
            {latest?.executed_at && <span style={{fontSize:11,color:'var(--text-muted)'}}>{formatDate(latest.executed_at)}</span>}
          </div>
        </div>

        <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
          {/* Badge do status mais recente */}
          <Badge text={latest?.status||'—'} color={ST[latest?.status]||'gray'}/>

          {/* Badge de retest pendente */}
          {hasRetest && (
            <span className="badge badge-purple">🔄 Retest</span>
          )}

          {/* Botão retest se pendente */}
          {retestExec && (
            <button className="btn btn-primary btn-sm"
              onClick={e => { e.stopPropagation(); onRetest(retestExec, group) }}
              style={{fontSize:12,padding:'4px 12px'}}>
              🔄 Executar Retest
            </button>
          )}
        </div>

        <span style={{color:'var(--text-muted)',fontSize:11}}>{expanded?'▲':'▼'}</span>
      </div>

      {/* Histórico expandido */}
      {expanded && (
        <div style={{borderTop:'1px solid var(--border)',padding:'0 16px 12px'}}>
          <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:600,padding:'10px 0 8px',letterSpacing:'.05em'}}>
            HISTÓRICO DE EXECUÇÕES
          </div>
          {group.executions.map((e, i) => (
            <div key={e.id} style={{
              display:'flex',alignItems:'center',gap:10,
              padding:'8px 10px',borderRadius:7,marginBottom:4,
              background: i===0 ? 'var(--bg-elevated)' : 'transparent',
              border: i===0 ? '1px solid var(--border)' : '1px solid transparent',
            }}>
              <span style={{fontSize:15}}>{ST_ICON[e.status]||'⬜'}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  <Badge text={e.status} color={ST[e.status]||'gray'}/>
                  <span style={{fontSize:12,color:'var(--text-muted)'}}>{e.execution_type}</span>
                  <span style={{fontSize:12,color:'var(--text-muted)',fontFamily:'monospace'}}>{formatDur(e.duration_seconds)}</span>
                  <span style={{fontSize:12,color:'var(--text-muted)'}}>{e.executed_by_name}</span>
                  <span style={{fontSize:11,color:'var(--text-muted)'}}>{formatDate(e.executed_at)}</span>
                  {i===0 && <span style={{fontSize:10,background:'var(--accent)',color:'#fff',padding:'1px 6px',borderRadius:4,fontWeight:600}}>ATUAL</span>}
                  {e.retest_reason && <span style={{fontSize:10,background:'rgba(168,85,247,0.2)',color:'var(--purple)',padding:'1px 6px',borderRadius:4}}>RETEST</span>}
                  {e.jira_bug_key && (
                    <a href={`${import.meta.env.VITE_JIRA_URL}/browse/${e.jira_bug_key}`} target="_blank" rel="noopener noreferrer"
                      style={{fontSize:11,color:'var(--red)',fontWeight:600,textDecoration:'none'}}>
                      🐛 {e.jira_bug_key}
                    </a>
                  )}
                </div>
                {e.comments && <div style={{fontSize:12,color:'var(--text-sec)',marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.comments}</div>}
                {e.retest_reason && <div style={{fontSize:11,color:'var(--purple)',marginTop:2}}>{e.retest_reason}</div>}
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                {e.status === 'not_run' && e.retest_reason && (
                  <button className="btn btn-primary btn-sm"
                    onClick={() => onRetest(e, group)}
                    style={{fontSize:11,padding:'3px 10px'}}>
                    🔄 Retest
                  </button>
                )}
                <button className="btn btn-ghost btn-xs" onClick={() => onDetail(e.id)}>Ver</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Executions() {
  const [list,    setList]    = useState([])
  const [groups,  setGroups]  = useState([])
  const [cycles,  setCycles]  = useState([])
  const [cases,   setCases]   = useState([])
  const [squads,  setSquads]  = useState([])
  const [loading, setLoad]    = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [detail,  setDetail]  = useState(null)
  const [retestExec, setRetestExec] = useState(null)
  const [retestGroup, setRetestGroup] = useState(null)
  const [filter,  setFilter]  = useState({ cycle_id:'', squad_id:'', status:'' })
  const [form,    setForm]    = useState({ cycle_id:'', test_case_id:'', squad_id:'', status:'passed', execution_type:'manual', duration_seconds:'', comments:'' })
  const [retestForm, setRetestForm] = useState({ status:'passed', duration_seconds:'', comments:'' })
  const [retestSaving, setRetestSaving] = useState(false)

  const load = useCallback(() => {
    setLoad(true)
    execApi.list(filter).then(r => {
      const data = r.data || []
      setList(data)
      setGroups(groupByCase(data))
    }).finally(() => setLoad(false))
  }, [filter])

  useEffect(() => {
    load()
    testCycles.list().then(r=>setCycles(r.data||[]))
    squadsApi.list().then(r=>setSquads(r.data||[]))
  }, [load])

  useEffect(() => {
    if (form.cycle_id) testCycles.getById(form.cycle_id).then(r => {
      const c = r.data; if (c?.cases) setCases(c.cases)
    })
  }, [form.cycle_id])

  const save = async () => {
    if (!form.cycle_id||!form.test_case_id||!form.squad_id) return
    setSaving(true)
    try {
      await execApi.create({...form, duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null})
      setShowNew(false)
      setForm({ cycle_id:'', test_case_id:'', squad_id:'', status:'passed', execution_type:'manual', duration_seconds:'', comments:'' })
      load()
    } finally { setSaving(false) }
  }

  const saveRetest = async () => {
    if (!retestExec) return
    setRetestSaving(true)
    try {
      await execApi.update(retestExec.id, {
        status:           retestForm.status,
        comments:         retestForm.comments || `Retest executado`,
        duration_seconds: retestForm.duration_seconds ? Number(retestForm.duration_seconds) : null,
      })
      // Atualiza bug se passou
      if (retestExec.jira_bug_key || retestGroup) {
        try {
          const bugs = await import('../services/api').then(m => m.default.get('/bugs'))
          const bug = (bugs.data||[]).find(b => b.retest_execution_id === retestExec.id)
          if (bug) {
            const newStatus = retestForm.status === 'passed' ? 'resolved' : 'open'
            await import('../services/api').then(m => m.default.patch(`/bugs/${bug.id}`, { status: newStatus }))
          }
        } catch(_) {}
      }
      setRetestExec(null)
      setRetestGroup(null)
      load()
    } finally { setRetestSaving(false) }
  }

  const openDetail = id => execApi.getById(id).then(r => setDetail(r.data))
  const formatDate = d => d ? new Date(d).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}) : '—'
  const formatDur  = s => { if(!s) return '—'; if(s<60) return `${s}s`; return `${Math.floor(s/60)}m ${s%60}s` }

  return (
    <Layout>
      <div className="page-header">
        <div className="page-hrow">
          <div>
            <div className="page-title">Execuções</div>
            <div className="page-sub">{list.length} execuções em {groups.length} casos</div>
          </div>
          <button className="btn btn-primary" onClick={()=>setShowNew(true)}>+ Registrar Execução</button>
        </div>
        <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}>
          <select className="input" style={{width:200}} value={filter.cycle_id} onChange={e=>setFilter(f=>({...f,cycle_id:e.target.value}))}>
            <option value="">Todos os ciclos</option>
            {cycles.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input" style={{width:160}} value={filter.squad_id} onChange={e=>setFilter(f=>({...f,squad_id:e.target.value}))}>
            <option value="">Todas as squads</option>
            {squads.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" style={{width:140}} value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
            <option value="">Todos status</option>
            {['passed','failed','blocked','skipped','in_progress','not_run'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Lista agrupada */}
      {loading ? (
        <div>{[1,2,3,4].map(i=><div key={i} className="skel" style={{height:60,marginBottom:10,borderRadius:10}}/>)}</div>
      ) : groups.length === 0 ? (
        <div className="card"><div className="empty"><div className="empty-icon">▶</div>Nenhuma execução encontrada</div></div>
      ) : (
        <div>
          {groups.map(g => (
            <CaseGroup key={g.case_id} group={g}
              onRetest={(exec, group) => { setRetestExec(exec); setRetestGroup(group); setRetestForm({ status:'passed', duration_seconds:'', comments:'' }) }}
              onDetail={openDetail}
            />
          ))}
        </div>
      )}

      {/* Modal Registrar Execução */}
      {showNew && (
        <Modal title="Registrar Execução" onClose={()=>setShowNew(false)}>
          <div className="form-group"><label className="form-label">Ciclo *</label>
            <select className="input" value={form.cycle_id} onChange={e=>setForm({...form,cycle_id:e.target.value,test_case_id:''})}>
              <option value="">Selecione um ciclo…</option>
              {cycles.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Caso de Teste *</label>
            <select className="input" value={form.test_case_id} onChange={e=>setForm({...form,test_case_id:e.target.value})}>
              <option value="">Selecione um caso…</option>
              {cases.map(c=><option key={c.id} value={c.test_case_id||c.id}>{c.code} — {c.title}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Squad *</label>
            <select className="input" value={form.squad_id} onChange={e=>setForm({...form,squad_id:e.target.value})}>
              <option value="">Selecione…</option>
              {squads.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Status *</label>
              <select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                {['passed','failed','blocked','skipped','in_progress','not_run'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Tipo</label>
              <select className="input" value={form.execution_type} onChange={e=>setForm({...form,execution_type:e.target.value})}>
                <option value="manual">Manual</option>
                <option value="automated">Automatizado</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Duração (segundos)</label>
            <input className="input" type="number" value={form.duration_seconds} onChange={e=>setForm({...form,duration_seconds:e.target.value})} placeholder="120"/>
          </div>
          <div className="form-group"><label className="form-label">Comentários</label>
            <textarea className="input" rows={3} value={form.comments} onChange={e=>setForm({...form,comments:e.target.value})} placeholder="Observações…"/>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={()=>setShowNew(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving||!form.cycle_id||!form.test_case_id||!form.squad_id}>
              {saving&&<span className="spinner spinner-sm"/>}Registrar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Retest */}
      {retestExec && (
        <Modal title={`🔄 Retest — ${retestGroup?.case_title||''}`} onClose={()=>setRetestExec(null)}>
          <div style={{background:'var(--bg-base)',borderRadius:8,padding:'12px 14px',marginBottom:16,fontSize:13}}>
            <div style={{fontWeight:600,color:'var(--text-pri)',marginBottom:4}}>{retestGroup?.case_title}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>Retest solicitado após resolução do bug no Jira</div>
            {retestExec.retest_reason && <div style={{fontSize:12,color:'var(--purple)',marginTop:4}}>{retestExec.retest_reason}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Resultado *</label>
            <div style={{display:'flex',gap:8}}>
              {[
                {value:'passed', label:'✅ Passou', color:'#22c55e'},
                {value:'failed', label:'❌ Falhou', color:'#f43f5e'},
                {value:'blocked',label:'⚠️ Bloqueado', color:'#eab308'},
              ].map(opt=>(
                <button key={opt.value} onClick={()=>setRetestForm(f=>({...f,status:opt.value}))} style={{
                  flex:1,padding:'10px 8px',borderRadius:8,
                  border:`2px solid ${retestForm.status===opt.value?opt.color:'var(--border)'}`,
                  background: retestForm.status===opt.value ? opt.color+'22' : 'transparent',
                  color: retestForm.status===opt.value ? opt.color : 'var(--text-muted)',
                  cursor:'pointer',fontWeight:600,fontSize:13,transition:'all .15s'
                }}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Duração (segundos)</label>
            <input className="input" type="number" value={retestForm.duration_seconds} onChange={e=>setRetestForm(f=>({...f,duration_seconds:e.target.value}))} placeholder="60"/>
          </div>
          <div className="form-group">
            <label className="form-label">Comentários</label>
            <textarea className="input" rows={3} value={retestForm.comments} onChange={e=>setRetestForm(f=>({...f,comments:e.target.value}))} placeholder="Descreva o resultado do retest..."/>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={()=>setRetestExec(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveRetest} disabled={retestSaving}>
              {retestSaving&&<span className="spinner spinner-sm"/>}
              Registrar Retest
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Detalhe */}
      {detail && (
        <Modal title="Detalhes da Execução" onClose={()=>setDetail(null)}>
          <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
            <Badge text={detail.status} color={ST[detail.status]||'gray'}/>
            <Badge text={detail.execution_type} color="blue"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
            {[
              ['Caso',         detail.test_case_title||'—'],
              ['Duração',      formatDur(detail.duration_seconds)],
              ['Executado por',detail.executed_by_name||'—'],
              ['Data',         formatDate(detail.executed_at)],
              ['Bug Jira',     detail.jira_bug_key||'—'],
            ].map(([l,v])=>(
              <div key={l}>
                <div className="form-label">{l}</div>
                <div style={{fontSize:13,color:'var(--text-pri)',fontWeight:500}}>{v}</div>
              </div>
            ))}
          </div>
          {detail.comments && (
            <div style={{background:'var(--bg-elevated)',borderRadius:'var(--r-md)',padding:12,fontSize:13,color:'var(--text-sec)'}}>
              <div className="form-label" style={{marginBottom:6}}>Comentários</div>
              {detail.comments}
            </div>
          )}
          <div className="form-actions"><button className="btn btn-ghost" onClick={()=>setDetail(null)}>Fechar</button></div>
        </Modal>
      )}
    </Layout>
  )
}
