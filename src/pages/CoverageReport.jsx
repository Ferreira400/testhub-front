import React, { useState, useEffect } from 'react'
import api from '../services/api'
import Layout from '../../Layout'

const RISK_CONFIG = {
  critico: { label: 'CRITICO', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: '🔴' },
  alto:    { label: 'ALTO',    color: '#f97316', bg: 'rgba(249,115,22,0.15)', icon: '🟠' },
  medio:   { label: 'MEDIO',   color: '#eab308', bg: 'rgba(234,179,8,0.15)',  icon: '🟡' },
  baixo:   { label: 'BAIXO',   color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: '🟢' },
}

const IMPACTO_COLOR = { alto: '#ef4444', medio: '#eab308', baixo: '#22c55e' }

const RiskBadge = ({ level }) => {
  const c = RISK_CONFIG[level] || RISK_CONFIG.baixo
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20,
      background: c.bg, color: c.color, border: `1px solid ${c.color}44`, whiteSpace: 'nowrap' }}>
      {c.icon} {c.label}
    </span>
  )
}

const ProgressBar = ({ value, color = '#4f7cff', showLabel = true }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${value || 0}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .5s' }} />
    </div>
    {showLabel && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 32 }}>{value ?? '—'}%</span>}
  </div>
)

const StatCard = ({ icon, label, value, color, sub }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 130 }}>
    <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color: color || 'var(--text-pri)', letterSpacing: '-.03em' }}>{value ?? '—'}</div>
    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{label.toUpperCase()}</div>
    {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
  </div>
)

export default function CoverageReport() {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [expanded,  setExpanded]  = useState({})
  const [filterRisk, setFilterRisk] = useState('')
  const [filterImpacto, setFilterImpacto] = useState('')
  const [search,    setSearch]    = useState('')
  const [sortBy,    setSortBy]    = useState('risk_score')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.get('/coverage/business-units')
      setData(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  const filtered = (data?.units || []).filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || [u.capacidade,u.dominio,u.produto,u.aplicacao,...u.componentes].some(v => v?.toLowerCase().includes(q))
    const matchRisk   = !filterRisk    || u.risk_level === filterRisk
    const matchImpact = !filterImpacto || u.impacto    === filterImpacto
    return matchSearch && matchRisk && matchImpact
  }).sort((a, b) => {
    if (sortBy === 'risk_score')  return b.risk_score - a.risk_score
    if (sortBy === 'total_cases') return b.total_cases - a.total_cases
    if (sortBy === 'failures')    return b.failures_30d - a.failures_30d
    if (sortBy === 'pass_rate')   return (b.pass_rate || 0) - (a.pass_rate || 0)
    return 0
  })

  if (loading) return (
    <Layout>
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando relatorio...</div>
    </Layout>
  )

  const { summary } = data || {}

  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-pri)', margin: 0 }}>
            Cobertura por Unidade de Negocio
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Analise de risco e cobertura de testes por capacidade, dominio, produto e componente
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>Atualizar</button>
      </div>

      {/* PRD Alert */}
      {summary?.prd_alerts > 0 && (
        <div style={{ marginBottom: 18, padding: '14px 18px', borderRadius: 12,
          background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.4)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444', marginBottom: 4 }}>
            ALERTA PRD — {summary.prd_alerts} unidade{summary.prd_alerts > 1 ? 's' : ''} com risco de bug em producao!
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-sec)' }}>
            Unidades com bugs recentes (ultimos 7 dias) e impacto alto podem estar comprometendo o ambiente de producao.
            Verifique os itens marcados com alerta PRD abaixo.
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard icon="🏢" label="Total Unidades"  value={summary?.total}        />
        <StatCard icon="✅" label="Com Cobertura"   value={summary?.covered}       color="var(--green)"
          sub={`${summary?.coverage_pct}% do total`} />
        <StatCard icon="⬜" label="Sem Cobertura"   value={summary?.uncovered}     color="var(--text-muted)" />
        <StatCard icon="🔴" label="Risco Critico"   value={summary?.criticos}      color="#ef4444" />
        <StatCard icon="🟠" label="Risco Alto"      value={summary?.altos}         color="#f97316" />
        <StatCard icon="⚠️" label="Alertas PRD"    value={summary?.prd_alerts}    color="#ef4444"
          sub="bugs nos ultimos 7 dias" />
      </div>

      {/* Cobertura geral */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>COBERTURA GERAL</div>
        <ProgressBar
          value={summary?.coverage_pct}
          color={summary?.coverage_pct >= 80 ? '#22c55e' : summary?.coverage_pct >= 50 ? '#eab308' : '#ef4444'}
        />
        <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
          {(data?.by_capacidade || []).map(cap => (
            <div key={cap.capacidade} style={{ minWidth: 160 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                {cap.capacidade.toUpperCase()} ({cap.covered}/{cap.total})
              </div>
              <ProgressBar
                value={cap.total > 0 ? Math.round((cap.covered / cap.total) * 100) : 0}
                color={cap.risk_max >= 70 ? '#ef4444' : cap.risk_max >= 40 ? '#eab308' : '#22c55e'}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="input" placeholder="Buscar capacidade, produto, componente..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        <select className="input" value={filterRisk} onChange={e => setFilterRisk(e.target.value)} style={{ width: 150 }}>
          <option value="">Todos (risco)</option>
          <option value="critico">Critico</option>
          <option value="alto">Alto</option>
          <option value="medio">Medio</option>
          <option value="baixo">Baixo</option>
        </select>
        <select className="input" value={filterImpacto} onChange={e => setFilterImpacto(e.target.value)} style={{ width: 150 }}>
          <option value="">Todos (impacto)</option>
          <option value="alto">Impacto Alto</option>
          <option value="medio">Impacto Medio</option>
          <option value="baixo">Impacto Baixo</option>
        </select>
        <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 160 }}>
          <option value="risk_score">Ordenar: Risco</option>
          <option value="failures">Ordenar: Falhas</option>
          <option value="total_cases">Ordenar: Casos</option>
          <option value="pass_rate">Ordenar: Pass Rate</option>
        </select>
      </div>

      {/* Tabela de unidades */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(u => (
          <div key={u.id} style={{
            background: 'var(--bg-card)', border: `1px solid ${u.prd_alert ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
            borderRadius: 12, overflow: 'hidden',
            boxShadow: u.prd_alert ? '0 0 0 1px rgba(239,68,68,0.2)' : 'none',
          }}>
            {/* Row principal */}
            <div
              style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
              onClick={() => toggle(u.id)}
            >
              {/* Hierarquia */}
              <div style={{ flex: 2, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-pri)' }}>{u.capacidade}</span>
                  <span style={{ color: 'var(--text-muted)' }}>›</span>
                  <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>{u.dominio}</span>
                  <span style={{ color: 'var(--text-muted)' }}>›</span>
                  <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>{u.produto}</span>
                  <span style={{ color: 'var(--text-muted)' }}>›</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.aplicacao}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {u.componentes.map(c => (
                    <span key={c} style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 6,
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Impacto */}
              <div style={{ minWidth: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>IMPACTO</div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  color: IMPACTO_COLOR[u.impacto], background: `${IMPACTO_COLOR[u.impacto]}22` }}>
                  {u.impacto.toUpperCase()}
                </span>
              </div>

              {/* Cobertura */}
              <div style={{ minWidth: 120 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>COBERTURA</div>
                {u.covered ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-pri)', marginBottom: 3 }}>
                      {u.total_cases} caso{u.total_cases !== 1 ? 's' : ''}
                    </div>
                    <ProgressBar value={u.pass_rate} color={u.pass_rate >= 80 ? '#22c55e' : u.pass_rate >= 60 ? '#eab308' : '#ef4444'} />
                  </>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>SEM COBERTURA</span>
                )}
              </div>

              {/* Falhas 30d */}
              <div style={{ minWidth: 80, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>FALHAS 30D</div>
                <span style={{ fontSize: 18, fontWeight: 800, color: u.failures_30d > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                  {u.failures_30d}
                </span>
              </div>

              {/* Bugs abertos */}
              <div style={{ minWidth: 80, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>BUGS ABERTOS</div>
                <span style={{ fontSize: 18, fontWeight: 800, color: u.open_bugs > 0 ? '#f97316' : 'var(--text-muted)' }}>
                  {u.open_bugs}
                </span>
              </div>

              {/* Risk */}
              <div style={{ minWidth: 100, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>RISCO</div>
                <RiskBadge level={u.risk_level} />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Score: {u.risk_score}</div>
              </div>

              {/* PRD Alert */}
              {u.prd_alert && (
                <div style={{ minWidth: 90, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#ef4444',
                    background: 'rgba(239,68,68,0.1)', padding: '4px 8px', borderRadius: 8,
                    border: '1px solid rgba(239,68,68,0.3)' }}>
                    ALERTA PRD
                    <div style={{ fontSize: 9, fontWeight: 600 }}>{u.bugs_last_7d} bug{u.bugs_last_7d > 1 ? 's' : ''} em 7d</div>
                  </div>
                </div>
              )}

              <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 'auto' }}>
                {expanded[u.id] ? '▲' : '▼'}
              </span>
            </div>

            {/* Detalhes expandidos */}
            {expanded[u.id] && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>

                  {/* Execucoes */}
                  <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>EXECUCOES</div>
                    {[
                      { label: 'Total',     value: u.total_executions, color: 'var(--text-pri)' },
                      { label: 'Passou',    value: u.passed_executions, color: '#22c55e' },
                      { label: 'Falhou',    value: u.failed_executions, color: '#ef4444' },
                      { label: 'Bloqueado', value: u.blocked_executions, color: '#eab308' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Cobertura detalhada */}
                  <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>COBERTURA</div>
                    <div style={{ fontSize: 12, color: 'var(--text-sec)', marginBottom: 6 }}>
                      {u.automated_cases} de {u.total_cases} casos automatizados
                    </div>
                    <ProgressBar
                      value={u.total_cases > 0 ? Math.round((u.automated_cases / u.total_cases) * 100) : 0}
                      color="#a855f7"
                    />
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                      Pass Rate geral: {u.pass_rate ?? '—'}%
                    </div>
                  </div>

                  {/* Analise de risco */}
                  <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>ANALISE DE RISCO</div>
                    <div style={{ marginBottom: 6 }}><RiskBadge level={u.risk_level} /></div>
                    <div style={{ fontSize: 11, color: 'var(--text-sec)', lineHeight: 1.6 }}>
                      {u.total_cases === 0 && <div>Sem casos de teste cadastrados</div>}
                      {u.failures_30d > 0 && <div>{u.failures_30d} falha{u.failures_30d > 1 ? 's' : ''} nos ultimos 30 dias</div>}
                      {u.open_bugs > 0 && <div>{u.open_bugs} bug{u.open_bugs > 1 ? 's' : ''} em aberto</div>}
                      {u.bugs_last_7d > 0 && <div style={{ color: '#ef4444', fontWeight: 700 }}>{u.bugs_last_7d} bug{u.bugs_last_7d > 1 ? 's' : ''} nos ultimos 7 dias</div>}
                      {u.prd_alert && <div style={{ color: '#ef4444', fontWeight: 700, marginTop: 4 }}>POSSIVEL IMPACTO EM PRD</div>}
                    </div>
                  </div>

                  {/* Componentes */}
                  <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>COMPONENTES</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {u.componentes.map(c => (
                        <div key={c} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                            background: 'var(--bg-elevated)', color: 'var(--blue)',
                            border: '1px solid rgba(79,124,255,0.2)' }}>{c}</span>
                          <span style={{ fontSize: 10, color: u.covered ? '#22c55e' : '#ef4444' }}>
                            {u.covered ? 'coberto' : 'sem cobertura'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Processo de negocio */}
                {u.processo_negocio && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>PROCESSO DE NEGOCIO</div>
                    <div style={{ fontSize: 12, color: 'var(--text-sec)' }}>{u.processo_negocio}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            Nenhuma unidade encontrada com os filtros selecionados
          </div>
        )}
      </div>
    </Layout>
  )
}

