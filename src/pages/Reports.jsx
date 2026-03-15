import React, { useEffect, useState } from 'react'
import { reports as reportsApi, squads as squadsApi, projects as projApi, testCycles } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import Layout from '../../Layout'

const SC = { passed:'#22c55e', failed:'#f43f5e', blocked:'#eab308', skipped:'#a855f7', not_run:'#334155', in_progress:'#22d3ee' }
const PC = { critical:'#f43f5e', high:'#f97316', medium:'#eab308', low:'#94a3b8' }

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-hi)', borderRadius:10, padding:'10px 14px', fontSize:12 }}>
      {label && <div style={{ color:'var(--text-muted)', marginBottom:5 }}>{label}</div>}
      {payload.map((p,i) => <div key={i} style={{ color:p.color, fontWeight:600 }}>{p.name}: {p.value}</div>)}
    </div>
  )
}

const StatCard = ({ label, value, sub, color }) => (
  <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 20px', flex:1 }}>
    <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, marginBottom:8 }}>{label}</div>
    <div style={{ fontSize:28, fontWeight:700, color: color || 'var(--text-pri)' }}>{value ?? '—'}</div>
    {sub && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{sub}</div>}
  </div>
)

const tabs = ['Dashboard', 'Progresso', 'Bugs', 'Squad']

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
    projApi.list().then(r => { const l = r.data||[]; setProjs(l); if(l[0]) setProjId(l[0].id) })
    squadsApi.list().then(r => { const l = r.data||[]; setSquads(l); if(l[0]) setSquadId(l[0].id) })
    testCycles.list().then(r => { const l = r.data||[]; setCycles(l); if(l[0]) setCycleId(l[0].id) })
  }, [])

  useEffect(() => { if (projId || squadId) fetchData() }, [activeTab, projId, squadId, cycleId])

  const fetchData = async () => {
    setLoad(true); setData(null)
    try {
      let res
      if (activeTab === 'Dashboard') res = await reportsApi.dashboard({ project_id: projId, squad_id: squadId })
      else if (activeTab === 'Progresso') res = await fetch(`/api/reports/execution-progress?project_id=${projId}&squad_id=${squadId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('testhub_token')}` } }).then(r => r.json())
      else if (activeTab === 'Bugs') res = await fetch(`/api/reports/bugs?project_id=${projId}&squad_id=${squadId}&days=30`, { headers: { Authorization: `Bearer ${localStorage.getItem('testhub_token')}` } }).then(r => r.json())
      else if (activeTab === 'Squad') res = await reportsApi.bySquad(squadId, { days: 30 })
      setData(res?.data || res)
    } catch(e) { console.error(e) }
    finally { setLoad(false) }
  }

  const pieData = (data?.status_summary||[]).filter(x=>x.total>0).map(x=>({ name:x.status, value:Number(x.total), color:SC[x.status]||'#334' }))

  return (
    <Layout>
      <div className="page-header">
        <div className="page-hrow">
          <div><div className="page-title">Relatórios</div><div className="page-sub">Análise de qualidade e desempenho</div></div>
          <div className="page-actions" style={{ flexWrap:'wrap', gap:8 }}>
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
        <div style={{ display:'flex', gap:0, marginTop:20, borderBottom:'1px solid var(--border)' }}>
          {tabs.map(t => (
            <button key={t} onClick={()=>setActiveTab(t)} style={{
              padding:'10px 20px', background:'none', border:'none', cursor:'pointer',
              fontSize:13, fontWeight:600,
              color: activeTab===t ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab===t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom:-1,
            }}>{t}</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>Carregando...</div>}

      {/* ── DASHBOARD ── */}
      {!loading && activeTab === 'Dashboard' && data && (
        <div>
          {/* Stats */}
          <div style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap' }}>
            {(() => {
              const s = data.status_summary || []
              const total   = s.reduce((a,x)=>a+Number(x.total),0)
              const passed  = Number(s.find(x=>x.status==='passed')?.total||0)
              const failed  = Number(s.find(x=>x.status==='failed')?.total||0)
              const blocked = Number(s.find(x=>x.status==='blocked')?.total||0)
              const rate    = total ? Math.round(passed/total*100) : 0
              return <>
                <StatCard label="Total Execuções"  value={total}   sub="no período" />
                <StatCard label="Taxa de Aprovação" value={`${rate}%`} color={rate>=80?'var(--green)':rate>=60?'var(--yellow)':'var(--red)'} sub={`${passed} aprovados`} />
                <StatCard label="Falhas"  value={failed}  color="var(--red)"    sub="execuções com falha" />
                <StatCard label="Bloqueados" value={blocked} color="var(--yellow)" sub="execuções bloqueadas" />
              </>
            })()}
          </div>

          <div className="grid-2" style={{ marginBottom:18 }}>
            {/* Pizza */}
            <div className="card">
              <div style={{ fontWeight:600, marginBottom:14, fontSize:14 }}>Distribuição por Status</div>
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

            {/* Tendência */}
            <div className="card">
              <div style={{ fontWeight:600, marginBottom:14, fontSize:14 }}>Tendência — 30 dias</div>
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

          {/* Por usuário */}
          {(data.by_user||[]).length > 0 && (
            <div className="card">
              <div style={{ fontWeight:600, marginBottom:14, fontSize:14 }}>Execuções por Usuário</div>
              <ResponsiveContainer width="100%" height={Math.max(160,(data.by_user||[]).length*44)}>
                <BarChart data={data.by_user||[]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                  <XAxis type="number" tick={{fill:'var(--text-muted)',fontSize:11}}/>
                  <YAxis type="category" dataKey="name" tick={{fill:'var(--text-sec)',fontSize:12}} width={120}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend/>
                  <Bar dataKey="passed"  fill="var(--green)"  name="Passou"   stackId="a" radius={[0,3,3,0]}/>
                  <Bar dataKey="failed"  fill="var(--red)"    name="Falhou"   stackId="a" radius={[0,3,3,0]}/>
                  <Bar dataKey="blocked" fill="var(--yellow)" name="Bloqueado" stackId="a" radius={[0,3,3,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── PROGRESSO ── */}
      {!loading && activeTab === 'Progresso' && data && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', fontWeight:600, fontSize:14, borderBottom:'1px solid var(--border)' }}>
            Progresso de Execução por Ciclo
          </div>
          {!(data.cycles||[]).length ? (
            <div className="empty"><div className="empty-icon">◎</div>Nenhum ciclo encontrado</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Ciclo</th><th>Ambiente</th><th>Build</th>
                  <th>Total</th><th>Executado</th><th>Passou</th><th>Falhou</th><th>Progresso</th><th>Aprovação</th>
                </tr>
              </thead>
              <tbody>
                {(data.cycles||[]).map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight:600, color:'var(--text-pri)' }}>{c.name}</td>
                    <td><span className="badge badge-cyan">{c.environment||'—'}</span></td>
                    <td style={{ fontFamily:'monospace', fontSize:12, color:'var(--text-muted)' }}>{c.build_version||'—'}</td>
                    <td>{c.total_cases}</td>
                    <td>{c.executed}</td>
                    <td style={{ color:'var(--green)', fontWeight:600 }}>{c.passed}</td>
                    <td style={{ color:'var(--red)', fontWeight:600 }}>{c.failed}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, height:6, background:'var(--bg-base)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ width:`${c.progress_pct||0}%`, height:'100%', background:'var(--accent)', borderRadius:3 }}/>
                        </div>
                        <span style={{ fontSize:12, color:'var(--text-muted)', minWidth:35 }}>{c.progress_pct||0}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight:700, color: (c.pass_rate||0)>=80?'var(--green)':(c.pass_rate||0)>=60?'var(--yellow)':'var(--red)' }}>
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

      {/* ── BUGS ── */}
      {!loading && activeTab === 'Bugs' && data && (
        <div>
          {/* Top Failing */}
          {(data.top_failing||[]).length > 0 && (
            <div className="card" style={{ marginBottom:18 }}>
              <div style={{ fontWeight:600, marginBottom:14, fontSize:14 }}>🔴 Casos com Mais Falhas (30 dias)</div>
              <table className="table">
                <thead><tr><th>Código</th><th>Título</th><th>Prioridade</th><th>Jira</th><th>Falhas</th><th>Última Falha</th></tr></thead>
                <tbody>
                  {(data.top_failing||[]).map((c,i) => (
                    <tr key={i}>
                      <td style={{ fontFamily:'monospace', color:'var(--blue)', fontSize:12 }}>{c.code}</td>
                      <td style={{ fontWeight:500 }}>{c.title}</td>
                      <td><span className={`badge badge-${c.priority==='critical'?'red':c.priority==='high'?'orange':c.priority==='medium'?'yellow':'gray'}`}>{c.priority}</span></td>
                      <td>{c.jira_key ? <a href={`${import.meta.env.VITE_JIRA_URL}/browse/${c.jira_key}`} target="_blank" rel="noopener noreferrer" style={{color:'var(--accent)',fontWeight:600,textDecoration:'none'}}>{c.jira_key}</a> : '—'}</td>
                      <td><span style={{ fontWeight:700, color:'var(--red)', fontSize:16 }}>{c.fail_count}</span></td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{c.last_failure ? new Date(c.last_failure).toLocaleDateString('pt-BR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid-2" style={{ marginBottom:18 }}>
            {/* Por prioridade */}
            <div className="card">
              <div style={{ fontWeight:600, marginBottom:14, fontSize:14 }}>Falhas por Prioridade</div>
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

            {/* Tendência de falhas */}
            <div className="card">
              <div style={{ fontWeight:600, marginBottom:14, fontSize:14 }}>Evolução de Falhas — 30 dias</div>
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

          {/* Lista de falhas */}
          {(data.failures||[]).length > 0 && (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', fontWeight:600, fontSize:14, borderBottom:'1px solid var(--border)' }}>
                Detalhes das Falhas
              </div>
              <table className="table">
                <thead><tr><th>Código</th><th>Título</th><th>Prioridade</th><th>Ciclo</th><th>Squad</th><th>Executado por</th><th>Comentários</th><th>Data</th></tr></thead>
                <tbody>
                  {(data.failures||[]).map(f => (
                    <tr key={f.id}>
                      <td style={{ fontFamily:'monospace', color:'var(--blue)', fontSize:12 }}>{f.code}</td>
                      <td style={{ fontWeight:500 }}>{f.title}</td>
                      <td><span className={`badge badge-${f.priority==='critical'?'red':f.priority==='high'?'orange':f.priority==='medium'?'yellow':'gray'}`}>{f.priority}</span></td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{f.cycle_name}</td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{f.squad_name}</td>
                      <td style={{ fontSize:13 }}>{f.executed_by}</td>
                      <td style={{ fontSize:12, color:'var(--text-sec)', maxWidth:200 }}>{f.comments||'—'}</td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{f.executed_at ? new Date(f.executed_at).toLocaleDateString('pt-BR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!(data.failures||[]).length && !(data.top_failing||[]).length && (
            <div className="empty"><div className="empty-icon">✅</div>Nenhuma falha encontrada nos últimos 30 dias!</div>
          )}
        </div>
      )}

      {/* ── SQUAD ── */}
      {!loading && activeTab === 'Squad' && data && (
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:14, fontSize:14 }}>Desempenho da Squad — 30 dias</div>
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
                    <td style={{ color:'var(--red)', fontWeight:600 }}>{m.failed||0}</td>
                    <td>
                      <span style={{ fontWeight:700, fontSize:15, color:(m.pass_rate||0)>=80?'var(--green)':(m.pass_rate||0)>=60?'var(--yellow)':'var(--red)' }}>
                        {m.pass_rate||0}%
                      </span>
                    </td>
                    <td>
                      <div style={{ width:120, height:6, background:'var(--bg-base)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${m.pass_rate||0}%`, height:'100%', background:(m.pass_rate||0)>=80?'var(--green)':(m.pass_rate||0)>=60?'var(--yellow)':'var(--red)', borderRadius:3 }}/>
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
