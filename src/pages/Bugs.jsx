import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import Layout from '../../Layout'

const STATUS_COLOR = {
  open: 'red', in_progress: 'yellow', resolved: 'green',
  closed: 'gray', retest_pending: 'purple'
}
const STATUS_LABEL = {
  open: '🔴 Aberto', in_progress: '🟡 Em andamento', resolved: '✅ Resolvido',
  closed: '⚪ Fechado', retest_pending: '🔄 Aguardando Retest'
}
const PRIORITY_COLOR = { critical:'red', high:'orange', medium:'yellow', low:'gray' }

const Badge = ({ text, color }) => <span className={`badge badge-${color}`}>{text}</span>

export default function Bugs() {
  const [bugs,    setBugs]    = useState([])
  const [squads,  setSquads]  = useState([])
  const [loading, setLoad]    = useState(true)
  const [filter,  setFilter]  = useState({ squad_id:'', status:'' })
  const navigate = useNavigate()

  const load = useCallback(() => {
    setLoad(true)
    api.get('/bugs', { params: filter })
      .then(r => setBugs(r.data || []))
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  // Atualiza automaticamente a cada 15s para refletir mudanças do Jira
  useEffect(() => {
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    api.get('/squads').then(r => setSquads(r.data || []))
  }, [])

  const openJira = (key) => window.open(`${import.meta.env.VITE_JIRA_URL}/browse/${key}`, '_blank')

  const goToRetest = (executionId) => {
    navigate(`/executions?retest=${executionId}`)
  }

  const stats = {
    open:           bugs.filter(b => b.status === 'open').length,
    retest_pending: bugs.filter(b => b.status === 'retest_pending').length,
    resolved:       bugs.filter(b => b.status === 'resolved').length,
    total:          bugs.length,
  }

  return (
    <Layout>
      <div className="page-header">
        <div className="page-hrow">
          <div>
            <div className="page-title">🐛 Bugs</div>
            <div className="page-sub">{bugs.length} bugs rastreados — atualiza a cada 15s</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load} style={{ fontSize:12 }}>
            🔄 Atualizar
          </button>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          <select className="input" style={{width:160}} value={filter.squad_id} onChange={e=>setFilter(f=>({...f,squad_id:e.target.value}))}>
            <option value="">Todas squads</option>
            {squads.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" style={{width:200}} value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
            <option value="">Todos status</option>
            {Object.entries(STATUS_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap' }}>
        {[
          ['🔴 Abertos',           stats.open,           'var(--red)'],
          ['🔄 Aguardando Retest', stats.retest_pending, 'var(--purple)'],
          ['✅ Resolvidos',        stats.resolved,       'var(--green)'],
          ['📊 Total',             stats.total,          'var(--accent)'],
        ].map(([label,value,color])=>(
          <div key={label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 20px', flex:1, minWidth:120 }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, marginBottom:6 }}>{label}</div>
            <div style={{ fontSize:26, fontWeight:700, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div style={{padding:20}}>{[1,2,3].map(i=><div key={i} className="skel" style={{height:52,marginBottom:8}}/>)}</div>
        ) : bugs.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">✅</div>
            <div>Nenhum bug encontrado</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:6}}>
              Bugs são criados automaticamente ao registrar execuções com falha.
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{width:90}}>Bug</th>
                <th>Caso</th>
                <th style={{width:90}}>Prioridade</th>
                <th style={{width:150}}>Ciclo</th>
                <th style={{width:100}}>Squad</th>
                <th style={{width:160}}>Status</th>
                <th style={{width:110}}>Criado em</th>
                <th style={{width:140}}>Retest</th>
              </tr>
            </thead>
            <tbody>
              {bugs.map(b => (
                <tr key={b.id} style={{ opacity: b.status==='closed' ? 0.6 : 1 }}>
                  <td>
                    <button
                      onClick={() => openJira(b.jira_bug_key)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', fontWeight:700, fontSize:13, textDecoration:'underline', padding:0 }}
                    >
                      🐛 {b.jira_bug_key}
                    </button>
                    {b.jira_story_key && (
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                        Story: <button onClick={() => openJira(b.jira_story_key)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent)', fontSize:11, padding:0 }}>{b.jira_story_key}</button>
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight:500, color:'var(--text-pri)', fontSize:13 }}>{b.case_title}</div>
                    <div style={{ fontFamily:'monospace', color:'var(--blue)', fontSize:11 }}>{b.case_code}</div>
                  </td>
                  <td><Badge text={b.priority} color={PRIORITY_COLOR[b.priority]||'gray'}/></td>
                  <td style={{ fontSize:12, color:'var(--text-muted)' }}>{b.cycle_name}</td>
                  <td style={{ fontSize:12, color:'var(--text-muted)' }}>{b.squad_name}</td>
                  <td>
                    <span className={`badge badge-${STATUS_COLOR[b.status]||'gray'}`}>
                      {STATUS_LABEL[b.status]||b.status}
                    </span>
                  </td>
                  <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                    {b.created_at ? new Date(b.created_at).toLocaleDateString('pt-BR') : '—'}
                    {b.resolved_at && (
                      <div style={{ fontSize:11, color:'var(--green)', marginTop:2 }}>
                        Resolvido: {new Date(b.resolved_at).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </td>
                  <td>
                    {b.status === 'retest_pending' && b.retest_execution_id ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => goToRetest(b.retest_execution_id)}
                        style={{ fontSize:12, padding:'4px 12px' }}
                      >
                        🔄 Executar Retest
                      </button>
                    ) : b.retest_execution_id ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => goToRetest(b.retest_execution_id)}
                        style={{ fontSize:12, padding:'4px 12px' }}
                      >
                        🔍 Ver Retest
                      </button>
                    ) : (
                      <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
