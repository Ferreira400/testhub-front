import React, { useEffect, useState } from 'react'
import { reports, squads as squadsApi, testCycles } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell } from 'recharts'
import Layout from '../../Layout'

const Tip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return <div style={{background:'var(--bg-elevated)',border:'1px solid var(--border-hi)',borderRadius:10,padding:'10px 14px',fontSize:12}}>{label&&<div style={{color:'var(--text-muted)',marginBottom:4,fontSize:11}}>{label}</div>}{payload.map((p,i)=><div key={i} style={{color:p.color||'var(--text-pri)',fontWeight:600}}>{p.name}: {p.value}</div>)}</div>
}

export default function Reports() {
  const [squads,   setSquads]   = useState([])
  const [cycles,   setCycles]   = useState([])
  const [squadId,  setSquadId]  = useState('')
  const [cycleId,  setCycleId]  = useState('')
  const [squadRpt, setSquadRpt] = useState(null)
  const [cycleRpt, setCycleRpt] = useState(null)
  const [loading,  setLoad]     = useState(false)

  useEffect(() => {
    squadsApi.list().then(r=>{const l=r.data||[];setSquads(l);if(l[0]){setSquadId(l[0].id)}})
    testCycles.list().then(r=>{const l=r.data||[];setCycles(l);if(l[0])setCycleId(l[0].id)})
  },[])

  useEffect(()=>{
    if(!squadId) return
    setLoad(true)
    reports.bySquad(squadId,{days:30}).then(r=>setSquadRpt(r.data)).finally(()=>setLoad(false))
  },[squadId])

  useEffect(()=>{
    if(!cycleId) return
    reports.byCycle(cycleId).then(r=>setCycleRpt(r.data))
  },[cycleId])

  const members = squadRpt?.members||[]
  const cycleSummary = cycleRpt?.status_summary||[]
  const total = cycleSummary.reduce((s,x)=>s+Number(x.count),0)
  const passed = Number(cycleSummary.find(x=>x.status==='passed')?.count||0)
  const rate = total ? Math.round(passed/total*100) : 0
  const SC = { passed:'#22c55e',failed:'#f43f5e',blocked:'#eab308',skipped:'#a855f7',not_run:'#334155',in_progress:'#22d3ee' }
  const pieData = cycleSummary.filter(x=>Number(x.count)>0).map(x=>({name:x.status,value:Number(x.count),color:SC[x.status]||'#334'}))

  return (
    <Layout>
      <div className="page-header">
        <div><div className="page-title">Relatórios</div><div className="page-sub">Análise de desempenho por squad e ciclo</div></div>
      </div>

      <div className="grid-2" style={{marginBottom:18}}>
        {/* Squad Report */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
            <div style={{fontWeight:600,fontSize:14,color:'var(--text-pri)'}}>Desempenho da Squad — 30 dias</div>
            <select className="input" style={{width:160}} value={squadId} onChange={e=>setSquadId(e.target.value)}>
              {squads.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {loading ? <div className="skel" style={{height:200}} /> :
          members.length===0 ? <div className="empty" style={{padding:'24px 0'}}><div className="empty-icon">◈</div>Sem dados</div> :
          <ResponsiveContainer width="100%" height={Math.max(180, members.length*52)}>
            <BarChart data={members} layout="vertical">
              <XAxis type="number" tick={{fill:'var(--text-muted)',fontSize:11}} />
              <YAxis type="category" dataKey="name" tick={{fill:'var(--text-sec)',fontSize:12}} width={90} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="passed"  fill="#22c55e" name="Passou"     stackId="a" radius={[0,3,3,0]} />
              <Bar dataKey="failed"  fill="#f43f5e" name="Falhou"     stackId="a" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>}
        </div>

        {/* Cycle Report */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
            <div style={{fontWeight:600,fontSize:14,color:'var(--text-pri)'}}>Status do Ciclo</div>
            <select className="input" style={{width:200}} value={cycleId} onChange={e=>setCycleId(e.target.value)}>
              <option value="">Selecione…</option>{cycles.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {cycleRpt && (
            <>
              <div style={{display:'flex',alignItems:'center',gap:20,marginBottom:16}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'var(--font-serif)',fontStyle:'italic',fontSize:42,color:rate>=80?'var(--green)':rate>=50?'var(--yellow)':'var(--red)',lineHeight:1}}>{rate}%</div>
                  <div style={{fontSize:11.5,color:'var(--text-muted)',marginTop:4}}>taxa de aprovação</div>
                </div>
                <div style={{flex:1}}>
                  {pieData.map(x=>(
                    <div key={x.name} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:x.color,flexShrink:0}} />
                      <div style={{flex:1,fontSize:12,color:'var(--text-sec)'}}>{x.name}</div>
                      <div style={{fontSize:12,fontWeight:600,color:'var(--text-pri)'}}>{x.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              {cycleRpt.cases_by_user?.length>0&&(
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={cycleRpt.cases_by_user}>
                    <XAxis dataKey="name" tick={{fill:'var(--text-muted)',fontSize:11}} />
                    <YAxis tick={{fill:'var(--text-muted)',fontSize:11}} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="passed" fill="#22c55e" name="Passou" stackId="a" />
                    <Bar dataKey="failed" fill="#f43f5e" name="Falhou" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
          {!cycleRpt&&<div className="empty" style={{padding:'32px 0'}}><div className="empty-icon">◑</div>Selecione um ciclo</div>}
        </div>
      </div>
    </Layout>
  )
}
