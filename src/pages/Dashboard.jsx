import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts'
import { reports, projects as projApi } from '../services/api'
import Layout from '../../Layout'

const SC = { passed:'#22c55e', failed:'#f43f5e', blocked:'#eab308', skipped:'#a855f7', not_run:'#334155', in_progress:'#22d3ee' }

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-hi)', borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'0 8px 24px rgba(0,0,0,.5)' }}>
      {label && <div style={{ color:'var(--text-muted)', marginBottom:5, fontSize:11 }}>{label}</div>}
      {payload.map((p,i) => <div key={i} style={{ color:p.color, fontWeight:600 }}>{p.name}: {p.value}</div>)}
    </div>
  )
}

function Stat({ label, value, sub, accent, loading }) {
  return (
    <div className={`stat-card stat-${accent} fade-up`}>
      <div className="stat-l">{label}</div>
      {loading
        ? <div className="skel" style={{ height:32, width:60, marginBottom:6 }} />
        : <div className="stat-v">{value ?? '—'}</div>}
      {sub && <div className="stat-s">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [data,  setData]  = useState(null)
  const [projId,setProjId]= useState('')
  const [projs, setProjs] = useState([])
  const [loading,setLoad] = useState(true)

  useEffect(() => {
    projApi.list().then(r => {
      const list = r.data || []
      setProjs(list)
      if (list[0]) setProjId(list[0].id)
    })
  }, [])

  useEffect(() => {
    if (!projId) return
    setLoad(true)
    reports.dashboard({ project_id: projId }).then(r => setData(r.data)).finally(() => setLoad(false))
  }, [projId])

  const summary  = data?.status_summary || []
  const total    = summary.reduce((s,x) => s + Number(x.total), 0)
  const passed   = Number(summary.find(x => x.status === 'passed')?.total  || 0)
  const failed   = Number(summary.find(x => x.status === 'failed')?.total  || 0)
  const passRate = total ? Math.round(passed / total * 100) : 0
  const cov      = data?.automation_coverage
  const pieData  = summary.filter(x => x.total > 0).map(x => ({ name:x.status, value:Number(x.total), color:SC[x.status]||'#334' }))
  const trend    = (data?.trend_30_days||[]).map(x => ({ ...x, date:x.date?.slice(5) }))
  const byUser   = data?.by_user || []

  return (
    <Layout>
      <div className="page-header">
        <div className="page-hrow">
          <div>
            <div className="page-title">Dashboard</div>
            <div className="page-sub">Visão geral de execuções e cobertura</div>
          </div>
          <div className="page-actions">
            <select className="input" style={{width:200}} value={projId} onChange={e=>setProjId(e.target.value)}>
              {projs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="stats-row stagger">
        <Stat label="Total de Testes"   value={total}   accent="blue"   loading={loading} />
        <Stat label="Passou"            value={passed}  accent="green"  loading={loading} sub={`${passRate}% taxa de aprovação`} />
        <Stat label="Falhou"            value={failed}  accent="red"    loading={loading} />
        <Stat label="Cobertura Auto"    value={cov ? `${cov.coverage_pct}%` : '—'} accent="purple" loading={loading} sub={cov ? `${cov.automated} de ${cov.total}` : ''} />
      </div>

      <div className="grid-2" style={{marginBottom:18}}>
        <div className="card">
          <div style={{fontWeight:600, marginBottom:18, fontSize:14, color:'var(--text-pri)'}}>Distribuição de Status</div>
          {loading ? <div className="skel" style={{height:200}} /> : pieData.length ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((e,i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<Tip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px 14px',marginTop:10}}>
                {pieData.map(x => (
                  <span key={x.name} style={{display:'flex',alignItems:'center',gap:6,fontSize:11.5,color:'var(--text-sec)'}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:x.color,display:'inline-block'}} />
                    {x.name} ({x.value})
                  </span>
                ))}
              </div>
            </>
          ) : <div className="empty"><div className="empty-icon">◎</div>Sem dados</div>}
        </div>

        <div className="card">
          <div style={{fontWeight:600, marginBottom:18, fontSize:14, color:'var(--text-pri)'}}>Tendência — 30 dias</div>
          {loading ? <div className="skel" style={{height:200}} /> : trend.length ? (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{fill:'var(--text-muted)',fontSize:11}} />
                <YAxis tick={{fill:'var(--text-muted)',fontSize:11}} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="passed"  stroke="var(--green)" strokeWidth={2} dot={false} name="Passou" />
                <Line type="monotone" dataKey="failed"  stroke="var(--red)"   strokeWidth={2} dot={false} name="Falhou" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty"><div className="empty-icon">◑</div>Sem dados de tendência</div>}
        </div>
      </div>

      <div className="card">
        <div style={{fontWeight:600, marginBottom:18, fontSize:14, color:'var(--text-pri)'}}>Execuções por Usuário</div>
        {loading ? <div className="skel" style={{height:200}} /> : byUser.length ? (
          <ResponsiveContainer width="100%" height={Math.max(200, byUser.length * 44)}>
            <BarChart data={byUser} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{fill:'var(--text-muted)',fontSize:11}} />
              <YAxis type="category" dataKey="name" tick={{fill:'var(--text-sec)',fontSize:12}} width={110} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="passed"  fill="var(--green)"  name="Passou"     radius={[0,3,3,0]} stackId="a" />
              <Bar dataKey="failed"  fill="var(--red)"    name="Falhou"     radius={[0,3,3,0]} stackId="a" />
              <Bar dataKey="blocked" fill="var(--yellow)"  name="Bloqueado" radius={[0,3,3,0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="empty"><div className="empty-icon">▶</div>Nenhuma execução registrada ainda</div>}
      </div>
    </Layout>
  )
}
