import React, { useEffect, useState } from 'react'
import { reports as reportsApi, squads as squadsApi, projects as projApi, testCycles } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area
} from 'recharts'
import Layout from '../../Layout'

const SC = { passed:'#22c55e', failed:'#f43f5e', blocked:'#eab308', skipped:'#a855f7', not_run:'#334155', in_progress:'#22d3ee' }
const PC = { critical:'#f43f5e', high:'#f97316', medium:'#eab308', low:'#94a3b8' }
const PRIORITY_LABEL = { critical:'CRITICAL', high:'HIGH', medium:'MEDIUM', low:'LOW' }

const authFetch = (url) =>
  fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('testhub_token')}` } }).then(r => r.json())

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-hi)', borderRadius:10, padding:'10px 14px', fontSize:12 }}>
      {label && <div style={{ color:'var(--text-muted)', marginBottom:5 }}>{label}</div>}
      {payload.map((p,i) => <div key={i} style={{ color:p.color, fontWeight:600 }}>{p.name}: {p.value}</div>)}
    </div>
  )
}

const StatCard = ({ label, value, sub, color, icon }) => (
  <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 20px', flex:1, minWidth:140 }}>
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
      {icon && <span style={{ fontSize:18 }}>{icon}</span>}
      <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, letterSpacing:'.05em' }}>{label.toUpperCase()}</div>
    </div>
    <div style={{ fontSize:28, fontWeight:800, color: color || 'var(--text-pri)', letterSpacing:'-.03em' }}>{value ?? '—'}</div>
    {sub && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{sub}</div>}
  </div>
)

const PriorityBadge = ({ priority }) => {
  const colors = { critical:'#f43f5e', high:'#f97316', medium:'#eab308', low:'#94a3b8' }
  const c = colors[priority] || '#94a3b8'
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
      background: c+'22', color: c, letterSpacing:'.04em' }}>
      {PRIORITY_LABEL[priority] || priority?.toUpperCase()}
    </span>
  )
}

const AgeChip = ({ hours }) => {
  if (!hours) return <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>
  const days = Math.floor(hours / 24)
  const color = hours < 24 ? 'var(--green)' : hours < 72 ? 'var(--yellow)' : 'var(--red)'
  return (
    <span style={{ fontSize:11, fontWeight:700, color, padding:'2px 8px', borderRadius:20,
      background: color === 'var(--green)' ? 'rgba(34,197,94,0.12)' : color === 'var(--yellow)' ? 'rgba(234,179,8,0.12)' : 'rgba(244,63,94,0.12)' }}>
      {days > 0 ? `${days}d ${hours % 24}h` : `${Math.round(hours)}h`}
    </span>
  )
}

const tabs = ['Dashboard', 'Progresso', 'Bugs por Sprint', 'Bugs', 'Squad']

export default function Reports() {
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [projs,   setProjs]   = useState([])
  const [squads,  setSquads]  = useState([])
  const [cycles,  setCycles]  = useState([])
  const [projId,  setProjId]  = useState('')
  const [squadId, setSquadId] = useState('')
  const [cycleId, setCycleId] = useState('')
  const [data,    setData]    = useState(null)
  const [loading, setLoad]    = useState(false)

  useEffect(() => {
    projApi.list().then(r  => { const l = r.data||[]; setProjs(l);  if(l[0]) setProjId(l[0].id) })
    squadsApi.list().then(r => { const l = r.data||[]; setSquads(l); if(l[0]) setSquadId(l[0].id) })
    testCycles.list().then(r => { const l = r.data||[]; setCycles(l); if(l[0]) setCycleId(l[0].id) })
  }, [])

  useEffect(() => { if (projId || squadId) fetchData() }, [activeTab, projId, squadId, cycleId])

  const fetchData = async () => {
    setLoad(true); setData(null)
    try {
      let res
      if (activeTab === 'Dashboard')
        res = await reportsApi.dashboard({ project_id: projId, squad_id: squadId })
      else if (activeTab === 'Progresso')
        res = await authFetch(`/api/reports/execution-progress?project_id=${projId}&squad_id=${squadId}`)
      else if (activeTab === 'Bugs')
        res = await authFetch(`/api/reports/bugs?project_id=${projId}&squad_id=${squadId}&days=30`)
      else if (activeTab === 'Bugs por Sprint')
        res = await authFetch(`/api/reports/bugs-by-sprint?project_id=${projId}&squad_id=${squadId}`)
      else if (activeTab === 'Squad')
        res = await reportsApi.bySquad(squadId, { days: 30 })
      setData(res?.data || res)
    } catch(e) { console.error(e) }
    finally { setLoad(false) }
  }

  const pieData = (data?.status_summary||[]).filter(x=>x.total>0).map(x=>({
    name: x.status, value: Number(x.total), color: SC[x.status]||'#334'
  }))

  const fmt = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
  const fmtHours = h => {
    if (!h) return '—'
    if (h < 1) return '<1h'
    if (h < 24) return `${Math.round(h)}h`
    return `${Math.floor(h/24)}d ${Math.round(h%24)}h`
  }

  return (
    <Layout>
      <div className="page-header">
        <div className="page-hrow">
          <div>
            <div className="page-title">Relatórios</div>
            <div className="page-sub">Análise de qualidade e desempenho</div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <select className="input" style={{width:160}} value={projId} onChange={e=>setProjId(e.target.value)}>
              {projs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="input" style={{width:150}} value={squadId} onChange={e=>setSquadId(e.target.value)}>
              <option value="">Todas squads</option>
              {squads.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, marginTop:20, borderBottom:'1px solid var(--border)', overflowX:'auto' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding:'10px 18px', background:'none', border:'none', cursor:'pointer', whiteSpace:'nowrap',
              fontSize:13, fontWeight:600, transition:'all .15s',
              color: activeTab===t ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab===t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom:-1,
            }}>{t}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding:60, textAlign:'center', color:'var(--text-muted)' }}>
          <div style={{ width:32, height:32, border:'3px solid var(--border)', borderTop:'3px solid var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          Carregando relatório…
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {!loading && activeTab === 'Dashboard' && data && (
        <div>
          <div style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap' }}>
            {(() => {
              const s = data.status_summary || []
              const total   = s.reduce((a,x) => a+Number(x.total), 0)
              const passed  = Number(s.find(x=>x.status==='passed')?.total||0)
              const failed  = Number(s.find(x=>x.status==='failed')?.total||0)
              const blocked = Number(s.find(x=>x.status==='blocked')?.total||0)
              const rate    = total ? Math.round(passed/total*100) : 0
              return <>
                <StatCard icon="▶" label="Total Execuções"   value={total}        sub="no período" />
                <StatCard icon="📊" label="Taxa de Aprovação" value={`${rate}%`}  color={rate>=80?'var(--green)':rate>=60?'#eab308':'var(--red)'} sub={`${passed} aprovados`} />
                <StatCard icon="❌" label="Falhas"            value={failed}       color="var(--red)"    sub="execuções com falha" />
                <StatCard icon="⚠️" label="Bloqueados"        value={blocked}      color="#eab308"       sub="execuções bloqueadas" />
              </>
            })()}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:14, fontSize:14 }}>Distribuição por Status</div>
              {pieData.length ? <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie><Tooltip content={<Tip/>}/></PieChart>
                </ResponsiveContainer>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 14px', marginTop:8 }}>
                  {pieData.map(x=>(
                    <span key={x.name} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-sec)' }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:x.color, display:'inline-block' }}/>
                      {x.name} ({x.value})
                    </span>
                  ))}
                </div>
              </> : <div className="empty"><div className="empty-icon">◎</div>Sem dados</div>}
            </div>
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:14, fontSize:14 }}>Tendência — 30 dias</div>
              {(data.trend_30_days||[]).length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={(data.trend_30_days||[]).map(x=>({...x,date:x.date?.slice(5)}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="date" tick={{fill:'var(--text-muted)',fontSize:11}}/>
                    <YAxis tick={{fill:'var(--text-muted)',fontSize:11}}/>
                    <Tooltip content={<Tip/>}/>
                    <Legend/>
                    <Line type="monotone" dataKey="passed" stroke="var(--green)" strokeWidth={2} dot={false} name="Passou"/>
                    <Line type="monotone" dataKey="failed" stroke="var(--red)"   strokeWidth={2} dot={false} name="Falhou"/>
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="empty"><div className="empty-icon">◒</div>Sem dados de tendência</div>}
            </div>
          </div>

          {(data.by_user||[]).length > 0 && (
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:14, fontSize:14 }}>Execuções por Usuário</div>
              <ResponsiveContainer width="100%" height={Math.max(160,(data.by_user||[]).length*44)}>
                <BarChart data={data.by_user||[]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                  <XAxis type="number" tick={{fill:'var(--text-muted)',fontSize:11}}/>
                  <YAxis type="category" dataKey="name" tick={{fill:'var(--text-sec)',fontSize:12}} width={120}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend/>
                  <Bar dataKey="passed"  fill="var(--green)"  name="Passou"    stackId="a" radius={[0,3,3,0]}/>
                  <Bar dataKey="failed"  fill="var(--red)"    name="Falhou"    stackId="a" radius={[0,3,3,0]}/>
                  <Bar dataKey="blocked" fill="#eab308"       name="Bloqueado" stackId="a" radius={[0,3,3,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── PROGRESSO ── */}
      {!loading && activeTab === 'Progresso' && data && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', fontWeight:700, fontSize:14, borderBottom:'1px solid var(--border)' }}>
            Progresso de Execução por Ciclo
          </div>
          {!(data.cycles||[]).length ? (
            <div className="empty"><div className="empty-icon">◎</div>Nenhum ciclo encontrado</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Ciclo</th><th>Ambiente</th><th>Build</th><th>Total</th><th>Passou</th><th>Falhou</th><th>Progresso</th><th>Aprovação</th></tr>
              </thead>
              <tbody>
                {(data.cycles||[]).map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight:600, color:'var(--text-pri)' }}>{c.name}</td>
                    <td><span className="badge badge-cyan">{c.environment||'—'}</span></td>
                    <td style={{ fontFamily:'monospace', fontSize:12, color:'var(--text-muted)' }}>{c.build_version||'—'}</td>
                    <td>{c.total_cases}</td>
                    <td style={{ color:'var(--green)', fontWeight:600 }}>{c.passed}</td>
                    <td style={{ color:'var(--red)',   fontWeight:600 }}>{c.failed}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, height:6, background:'var(--bg-base)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ width:`${c.progress_pct||0}%`, height:'100%', background:'var(--accent)', borderRadius:3 }}/>
                        </div>
                        <span style={{ fontSize:12, color:'var(--text-muted)', minWidth:35 }}>{c.progress_pct||0}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight:700, color:(c.pass_rate||0)>=80?'var(--green)':(c.pass_rate||0)>=60?'#eab308':'var(--red)' }}>
                        {c.pass_rate||0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── BUGS POR SPRINT ── */}
      {!loading && activeTab === 'Bugs por Sprint' && data && (
        <div>
          {/* Métricas globais */}
          <div style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap' }}>
            <StatCard icon="🐛" label="Total Bugs"         value={data.global?.total||0}           sub="todos os sprints" />
            <StatCard icon="🔴" label="Em Aberto"          value={data.global?.open||0}            color="var(--red)"    sub={`${data.global?.critical_open||0} críticos`} />
            <StatCard icon="🔄" label="Aguardando Retest"  value={data.global?.retest_pending||0}  color="var(--purple)" sub="pendentes de verificação" />
            <StatCard icon="✅" label="Taxa de Resolução"  value={`${data.global?.resolution_rate||0}%`} color={(data.global?.resolution_rate||0)>=70?'var(--green)':'#eab308'} sub="bugs resolvidos" />
            <StatCard icon="⏱" label="Tempo Médio Resolução" value={fmtHours(data.global?.avg_resolution_hours)} sub="da abertura ao fechamento" />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
            {/* Evolução de bugs abertos */}
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:14, fontSize:14 }}>📈 Evolução de Bugs — 60 dias</div>
              {(data.trend||[]).length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={(data.trend||[]).map(x=>({...x, date:x.date?.slice(5)}))}>
                    <defs>
                      <linearGradient id="bugGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="date" tick={{fill:'var(--text-muted)',fontSize:10}}/>
                    <YAxis tick={{fill:'var(--text-muted)',fontSize:11}}/>
                    <Tooltip content={<Tip/>}/>
                    <Area type="monotone" dataKey="opened" stroke="#f43f5e" fill="url(#bugGrad)" strokeWidth={2} name="Bugs Abertos"/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="empty"><div className="empty-icon">◎</div>Sem dados</div>}
            </div>

            {/* Bugs por prioridade dos abertos */}
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:14, fontSize:14 }}>⚠️ Bugs Críticos em Aberto</div>
              {(data.critical_open||[]).length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)' }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
                  <div style={{ fontSize:14, fontWeight:600 }}>Nenhum bug crítico em aberto!</div>
                </div>
              ) : (
                <div style={{ maxHeight:200, overflowY:'auto' }}>
                  {(data.critical_open||[]).map((b,i) => (
                    <div key={i} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'8px 0',
                      borderBottom:'1px solid var(--border)',
                    }}>
                      <PriorityBadge priority={b.priority}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--text-pri)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {b.case_title}
                        </div>
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{b.cycle_name} · {b.squad_name}</div>
                      </div>
                      <AgeChip hours={b.age_hours}/>
                      <a href={`${import.meta.env.VITE_JIRA_URL||''}/browse/${b.jira_bug_key}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize:11, color:'var(--accent)', fontWeight:700, textDecoration:'none', flexShrink:0 }}>
                        {b.jira_bug_key}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bugs por Sprint (ciclo) */}
          <div className="card" style={{ marginBottom:18, padding:0, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', fontWeight:700, fontSize:14, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
              🏃 Bugs por Sprint
            </div>
            {!(data.by_cycle||[]).length ? (
              <div className="empty"><div className="empty-icon">◎</div>Nenhum sprint com bugs</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Sprint / Ciclo</th>
                    <th>Total</th>
                    <th>🔴 Aberto</th>
                    <th>🔄 Em andamento</th>
                    <th>✅ Resolvido</th>
                    <th>🔄 Retest</th>
                    <th>Resolução</th>
                    <th>Tempo Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.by_cycle||[]).map(c => (
                    <tr key={c.cycle_id}>
                      <td>
                        <div style={{ fontWeight:700, color:'var(--text-pri)', fontSize:13 }}>{c.cycle_name}</div>
                        <div style={{ display:'flex', gap:6, marginTop:3 }}>
                          {c.environment && <span className="badge badge-cyan" style={{fontSize:10}}>{c.environment}</span>}
                          {c.build_version && <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace' }}>{c.build_version}</span>}
                        </div>
                      </td>
                      <td style={{ fontWeight:700, fontSize:15 }}>{c.total_bugs}</td>
                      <td>
                        <span style={{ fontWeight:700, color:'var(--red)' }}>{c.open||0}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight:700, color:'#eab308' }}>{c.in_progress||0}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight:700, color:'var(--green)' }}>{c.resolved||0}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight:700, color:'var(--purple)' }}>{c.retest_pending||0}</span>
                      </td>
                      <td>
                        {/* Barra de resolução */}
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:80, height:6, background:'var(--bg-base)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{
                              width:`${c.resolution_rate||0}%`, height:'100%', borderRadius:3,
                              background:(c.resolution_rate||0)>=70?'var(--green)':(c.resolution_rate||0)>=40?'#eab308':'var(--red)',
                            }}/>
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:(c.resolution_rate||0)>=70?'var(--green)':(c.resolution_rate||0)>=40?'#eab308':'var(--red)' }}>
                            {c.resolution_rate||0}%
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                        {fmtHours(c.avg_resolution_hours)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Top casos com mais bugs */}
          {(data.top_cases||[]).length > 0 && (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', fontWeight:700, fontSize:14, borderBottom:'1px solid var(--border)' }}>
                🔁 Casos com Mais Recorrência de Bugs
              </div>
              <table className="table">
                <thead>
                  <tr><th>Código</th><th>Caso</th><th>Prioridade</th><th>Jira</th><th>Total Bugs</th><th>Em Aberto</th><th>Último Bug</th></tr>
                </thead>
                <tbody>
                  {(data.top_cases||[]).map((c,i) => (
                    <tr key={i}>
                      <td style={{ fontFamily:'monospace', color:'var(--blue)', fontSize:12, fontWeight:700 }}>{c.code}</td>
                      <td style={{ fontWeight:500, fontSize:13 }}>{c.title}</td>
                      <td><PriorityBadge priority={c.priority}/></td>
                      <td>
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          {c.jira_key && (<a href={`${import.meta.env.VITE_JIRA_URL||""}/browse/${c.jira_key}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"var(--blue)", fontWeight:700, textDecoration:"none" }}>📋 {c.jira_key}</a>)}
                          {c.bug_keys && c.bug_keys.split(",").map(k => (<a key={k} href={`${import.meta.env.VITE_JIRA_URL||""}/browse/${k}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"var(--red)", fontWeight:700, textDecoration:"none" }}>🐛 {k}</a>))}
                          {!c.jira_key && !c.bug_keys && <span style={{ color:"var(--text-muted)" }}>�</span>}
                        </div>
                      </td>
                      <td><span style={{ fontWeight:800, fontSize:18, color:'var(--red)' }}>{c.bug_count}</span></td>
                      <td>
                        {c.open_count > 0
                          ? <span style={{ fontWeight:700, color:'var(--red)' }}>{c.open_count} aberto{c.open_count>1?'s':''}</span>
                          : <span style={{ color:'var(--green)', fontWeight:600 }}>✅ Nenhum</span>}
                      </td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{fmt(c.last_bug)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── BUGS ── */}
      {!loading && activeTab === 'Bugs' && data && (
        <div>
          {(data.top_failing||[]).length > 0 && (
            <div className="card" style={{ marginBottom:18 }}>
              <div style={{ fontWeight:700, marginBottom:14, fontSize:14 }}>🔴 Casos com Mais Falhas (30 dias)</div>
              <table className="table">
                <thead><tr><th>Código</th><th>Título</th><th>Prioridade</th><th>Jira</th><th>Falhas</th><th>Última Falha</th></tr></thead>
                <tbody>
                  {(data.top_failing||[]).map((c,i) => (
                    <tr key={i}>
                      <td style={{ fontFamily:'monospace', color:'var(--blue)', fontSize:12 }}>{c.code}</td>
                      <td style={{ fontWeight:500 }}>{c.title}</td>
                      <td><PriorityBadge priority={c.priority}/></td>
                      <td>{c.jira_key ? <a href={`${import.meta.env.VITE_JIRA_URL||''}/browse/${c.jira_key}`} target="_blank" rel="noopener noreferrer" style={{color:'var(--accent)',fontWeight:600,textDecoration:'none'}}>{c.jira_key}</a> : '—'}</td>
                      <td><span style={{ fontWeight:800, color:'var(--red)', fontSize:16 }}>{c.fail_count}</span></td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{fmt(c.last_failure)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:14, fontSize:14 }}>Falhas por Prioridade</div>
              {(data.by_priority||[]).length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.by_priority||[]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="priority" tick={{fill:'var(--text-muted)',fontSize:12}}/>
                    <YAxis tick={{fill:'var(--text-muted)',fontSize:11}}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="total" name="Falhas" radius={[4,4,0,0]}>
                      {(data.by_priority||[]).map((e,i)=><Cell key={i} fill={PC[e.priority]||'#888'}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="empty"><div className="empty-icon">◎</div>Sem dados</div>}
            </div>
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:14, fontSize:14 }}>Evolução de Falhas — 30 dias</div>
              {(data.trend||[]).length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={(data.trend||[]).map(x=>({...x,date:x.date?.slice(5)}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="date" tick={{fill:'var(--text-muted)',fontSize:11}}/>
                    <YAxis tick={{fill:'var(--text-muted)',fontSize:11}}/>
                    <Tooltip content={<Tip/>}/>
                    <Line type="monotone" dataKey="failures" stroke="var(--red)" strokeWidth={2} dot={false} name="Falhas"/>
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="empty"><div className="empty-icon">◒</div>Sem dados</div>}
            </div>
          </div>

          {(data.failures||[]).length > 0 && (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', fontWeight:700, fontSize:14, borderBottom:'1px solid var(--border)' }}>Detalhes das Falhas</div>
              <table className="table">
                <thead><tr><th>Código</th><th>Título</th><th>Prioridade</th><th>Ciclo</th><th>Squad</th><th>Executado por</th><th>Comentários</th><th>Data</th></tr></thead>
                <tbody>
                  {(data.failures||[]).map(f => (
                    <tr key={f.id}>
                      <td style={{ fontFamily:'monospace', color:'var(--blue)', fontSize:12 }}>{f.code}</td>
                      <td style={{ fontWeight:500 }}>{f.title}</td>
                      <td><PriorityBadge priority={f.priority}/></td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{f.cycle_name}</td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{f.squad_name}</td>
                      <td style={{ fontSize:13 }}>{f.executed_by}</td>
                      <td style={{ fontSize:12, color:'var(--text-sec)', maxWidth:200 }}>{f.comments||'—'}</td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{fmt(f.executed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!(data.failures||[]).length && !(data.top_failing||[]).length && (
            <div className="empty"><div className="empty-icon">✅</div>Nenhuma falha nos últimos 30 dias!</div>
          )}
        </div>
      )}

      {/* ── SQUAD ── */}
      {!loading && activeTab === 'Squad' && data && (
        <div className="card">
          <div style={{ fontWeight:700, marginBottom:14, fontSize:14 }}>Desempenho da Squad — 30 dias</div>
          {!(data.members||[]).length ? (
            <div className="empty"><div className="empty-icon">◎</div>Nenhum membro encontrado</div>
          ) : (
            <table className="table">
              <thead><tr><th>Membro</th><th>Total</th><th>Passou</th><th>Falhou</th><th>Taxa Aprovação</th><th>Performance</th></tr></thead>
              <tbody>
                {(data.members||[]).map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight:600, color:'var(--text-pri)' }}>{m.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{m.email}</div>
                    </td>
                    <td style={{ fontWeight:600 }}>{m.total_executions||0}</td>
                    <td style={{ color:'var(--green)', fontWeight:600 }}>{m.passed||0}</td>
                    <td style={{ color:'var(--red)',   fontWeight:600 }}>{m.failed||0}</td>
                    <td>
                      <span style={{ fontWeight:700, fontSize:15, color:(m.pass_rate||0)>=80?'var(--green)':(m.pass_rate||0)>=60?'#eab308':'var(--red)' }}>
                        {m.pass_rate||0}%
                      </span>
                    </td>
                    <td>
                      <div style={{ width:120, height:6, background:'var(--bg-base)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${m.pass_rate||0}%`, height:'100%', borderRadius:3,
                          background:(m.pass_rate||0)>=80?'var(--green)':(m.pass_rate||0)>=60?'#eab308':'var(--red)' }}/>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Layout>
  )
}

