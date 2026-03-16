import React, { useEffect, useState, useCallback } from 'react'
import { executions as execApi, testCycles, squads as squadsApi } from '../services/api'
import Layout from '../../Layout'

const ST       = { passed:'green', failed:'red', blocked:'yellow', skipped:'purple', in_progress:'cyan', not_run:'gray' }
const ST_ICON  = { passed:'✅', failed:'❌', blocked:'⚠️', skipped:'⏭️', in_progress:'🔄', not_run:'⬜' }
const ST_LABEL = { passed:'Passou', failed:'Falhou', blocked:'Bloqueado', skipped:'Pulado', in_progress:'Em andamento', not_run:'Pendente' }

const Badge = ({ text, color }) => (
  <span className={`badge badge-${color}`} style={{fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:600}}>
    {ST_LABEL[text] || text}
  </span>
)

const Modal = ({ title, onClose, children }) => (
  <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal" style={{ maxWidth: 540, borderRadius: 14 }}>
      <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div className="modal-title" style={{fontSize:15,fontWeight:700}}>{title}</div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  </div>
)

function groupByCase(list) {
  const map = {}
  for (const e of list) {
    const key = e.test_case_id || e.id
    if (!map[key]) map[key] = {
      case_id: key,
      case_title: e.test_case_title,
      case_code: e.test_case_code,
      executions: []
    }
    map[key].executions.push(e)
  }
  for (const key of Object.keys(map)) {
    map[key].executions.sort((a, b) =>
      new Date(b.executed_at || b.started_at) - new Date(a.executed_at || a.started_at)
    )
  }
  return Object.values(map).sort((a, b) => {
    const aDate = new Date(a.executions[0]?.executed_at || 0)
    const bDate = new Date(b.executions[0]?.executed_at || 0)
    return bDate - aDate
  })
}

function getTrend(executions) {
  const real = executions.filter(e => e.status !== 'not_run')
  if (real.length < 2) return null
  const last = real[0].status
  const prev = real[1].status
  if (last === 'passed' && prev === 'failed') return 'improving'
  if (last === 'failed' && prev === 'passed') return 'degrading'
  return null
}

function getPassRate(executions) {
  const real = executions.filter(e => e.status !== 'not_run')
  if (!real.length) return null
  const passed = real.filter(e => e.status === 'passed').length
  return Math.round((passed / real.length) * 100)
}

function CaseGroup({ group, onRetest, onDetail }) {
  const [expanded, setExpanded] = useState(false)
  const latest     = group.executions[0]
  const retestExec = group.executions.find(e => e.status === 'not_run' && e.retest_reason)
  const hasFailed  = group.executions.some(e => e.status === 'failed')
  const trend      = getTrend(group.executions)
  const passRate   = getPassRate(group.executions)

  const fmt     = d => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
  const fmtDur  = s => { if (!s) return '—'; if (s < 60) return `${s}s`; return `${Math.floor(s / 60)}m ${s % 60}s` }

  const borderColor = retestExec ? 'var(--purple)'
    : latest?.status === 'passed' ? 'var(--green)'
    : latest?.status === 'failed' ? 'var(--red)'
    : latest?.status === 'blocked' ? '#eab308'
    : 'var(--border)'

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: 10,
      marginBottom: 8,
      overflow: 'hidden',
      transition: 'box-shadow .15s',
    }}>
      {/* Header do grupo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>

        <span style={{ fontSize: 20, flexShrink: 0 }}>{ST_ICON[latest?.status] || '⬜'}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-pri)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {group.case_title || '—'}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            {group.case_code && (
              <span style={{ fontFamily: 'monospace', color: 'var(--blue)', fontSize: 11, fontWeight: 600 }}>
                {group.case_code}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {group.executions.length} execução{group.executions.length !== 1 ? 'ões' : ''}
            </span>
            {latest?.executed_by_name && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {latest.executed_by_name}</span>
            )}
            {latest?.executed_at && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {fmt(latest.executed_at)}</span>
            )}
          </div>
        </div>

        {/* Métricas */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>

          {/* Taxa de aprovação */}
          {passRate !== null && group.executions.filter(e => e.status !== 'not_run').length > 1 && (
            <div style={{ textAlign: 'center', minWidth: 40 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: passRate >= 70 ? 'var(--green)' : passRate >= 40 ? '#eab308' : 'var(--red)' }}>
                {passRate}%
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.04em' }}>PASS</div>
            </div>
          )}

          {/* Tendência */}
          {trend === 'improving' && (
            <span title="Melhorando" style={{ fontSize: 16, color: 'var(--green)' }}>↑</span>
          )}
          {trend === 'degrading' && (
            <span title="Degradando" style={{ fontSize: 16, color: 'var(--red)' }}>↓</span>
          )}

          {/* Status badge */}
          <Badge text={latest?.status || '—'} color={ST[latest?.status] || 'gray'} />

          {/* Badge retest */}
          {retestExec && (
            <span style={{ fontSize: 10, background: 'rgba(168,85,247,0.15)', color: 'var(--purple)', padding: '2px 8px', borderRadius: 20, fontWeight: 700, border: '1px solid rgba(168,85,247,0.3)' }}>
              🔄 RETEST
            </span>
          )}

          {/* Botão retest */}
          {retestExec && (
            <button className="btn btn-primary btn-sm"
              onClick={e => { e.stopPropagation(); onRetest(retestExec, group) }}
              style={{ fontSize: 12, padding: '4px 14px', borderRadius: 20 }}>
              Executar Retest
            </button>
          )}
        </div>

        <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 4 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Timeline expandida */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px 16px' }}>

          {/* Resumo rápido */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            {['passed', 'failed', 'blocked', 'not_run'].map(s => {
              const count = group.executions.filter(e => e.status === s).length
              if (!count) return null
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <span>{ST_ICON[s]}</span>
                  <span style={{ color: 'var(--text-sec)', fontWeight: 600 }}>{count}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{ST_LABEL[s]}</span>
                </div>
              )
            })}
          </div>

          {/* Timeline */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '.06em', marginBottom: 8 }}>
            HISTÓRICO
          </div>
          <div style={{ position: 'relative' }}>
            {/* Linha vertical */}
            <div style={{ position: 'absolute', left: 15, top: 20, bottom: 20, width: 2, background: 'var(--border)', borderRadius: 2 }} />

            {group.executions.map((e, i) => (
              <div key={e.id} style={{ display: 'flex', gap: 12, marginBottom: 8, position: 'relative' }}>
                {/* Ícone na timeline */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  background: 'var(--bg-card)', border: `2px solid ${borderColor}`,
                }}>
                  {ST_ICON[e.status] || '⬜'}
                </div>

                {/* Conteúdo */}
                <div style={{
                  flex: 1, background: i === 0 ? 'var(--bg-elevated)' : 'transparent',
                  border: `1px solid ${i === 0 ? 'var(--border)' : 'transparent'}`,
                  borderRadius: 8, padding: '8px 12px',
                }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                    <Badge text={e.status} color={ST[e.status] || 'gray'} />
                    {i === 0 && (
                      <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', padding: '1px 7px', borderRadius: 20, fontWeight: 700 }}>ATUAL</span>
                    )}
                    {e.retest_reason && (
                      <span style={{ fontSize: 10, background: 'rgba(168,85,247,0.15)', color: 'var(--purple)', padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>RETEST</span>
                    )}
                    {e.jira_bug_key && (
                      <a href={`${import.meta.env.VITE_JIRA_URL || ''}/browse/${e.jira_bug_key}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={ev => ev.stopPropagation()}
                        style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, textDecoration: 'none' }}>
                        🐛 {e.jira_bug_key}
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    {e.executed_by_name && <span>👤 {e.executed_by_name}</span>}
                    {e.duration_seconds && <span>⏱ {fmtDur(e.duration_seconds)}</span>}
                    {e.executed_at && <span>📅 {fmt(e.executed_at)}</span>}
                    <span style={{ textTransform: 'capitalize' }}>{e.execution_type}</span>
                  </div>

                  {e.comments && (
                    <div style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 4, fontStyle: 'italic' }}>
                      "{e.comments}"
                    </div>
                  )}
                  {e.retest_reason && (
                    <div style={{ fontSize: 11, color: 'var(--purple)', marginTop: 3 }}>↩ {e.retest_reason}</div>
                  )}

                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {e.status === 'not_run' && e.retest_reason && (
                      <button className="btn btn-primary btn-sm"
                        onClick={() => onRetest(e, group)}
                        style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20 }}>
                        🔄 Executar Retest
                      </button>
                    )}
                    <button className="btn btn-ghost btn-xs" onClick={() => onDetail(e.id)}
                      style={{ fontSize: 11 }}>
                      Ver detalhes
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Executions() {
  const [list,       setList]       = useState([])
  const [groups,     setGroups]     = useState([])
  const [cycles,     setCycles]     = useState([])
  const [cases,      setCases]      = useState([])
  const [squads,     setSquads]     = useState([])
  const [loading,    setLoad]       = useState(true)
  const [showNew,    setShowNew]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [detail,     setDetail]     = useState(null)
  const [retestExec, setRetestExec] = useState(null)
  const [retestGroup,setRetestGroup]= useState(null)
  const [retestSaving,setRetestSaving]= useState(false)
  const [filter,     setFilter]     = useState({ cycle_id: '', squad_id: '', status: '' })
  const [form,       setForm]       = useState({ cycle_id: '', test_case_id: '', squad_id: '', status: 'passed', execution_type: 'manual', duration_seconds: '', comments: '' })
  const [retestForm, setRetestForm] = useState({ status: 'passed', duration_seconds: '', comments: '' })

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
    testCycles.list().then(r => setCycles(r.data || []))
    squadsApi.list().then(r => setSquads(r.data || []))
  }, [load])

  useEffect(() => {
    if (form.cycle_id) testCycles.getById(form.cycle_id).then(r => {
      const c = r.data; if (c?.cases) setCases(c.cases)
    })
  }, [form.cycle_id])

  const save = async () => {
    if (!form.cycle_id || !form.test_case_id || !form.squad_id) return
    setSaving(true)
    try {
      await execApi.create({ ...form, duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null })
      setShowNew(false)
      setForm({ cycle_id: '', test_case_id: '', squad_id: '', status: 'passed', execution_type: 'manual', duration_seconds: '', comments: '' })
      load()
    } finally { setSaving(false) }
  }

  const saveRetest = async () => {
    if (!retestExec) return
    setRetestSaving(true)
    try {
      await execApi.update(retestExec.id, {
        status: retestForm.status,
        comments: retestForm.comments || 'Retest executado',
        duration_seconds: retestForm.duration_seconds ? Number(retestForm.duration_seconds) : null,
      })
      // Atualiza bug se passou
      try {
        const api = (await import('../services/api')).default
        const bugs = await api.get('/bugs')
        const bug = (bugs.data || []).find(b => b.retest_execution_id === retestExec.id)
        if (bug) {
          const newStatus = retestForm.status === 'passed' ? 'resolved' : 'open'
          await api.patch(`/bugs/${bug.id}`, { status: newStatus })
        }
      } catch (_) {}
      setRetestExec(null)
      setRetestGroup(null)
      load()
    } finally { setRetestSaving(false) }
  }

  const openDetail = id => execApi.getById(id).then(r => setDetail(r.data))
  const fmt    = d => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
  const fmtDur = s => { if (!s) return '—'; if (s < 60) return `${s}s`; return `${Math.floor(s / 60)}m ${s % 60}s` }

  const totalPassed  = list.filter(e => e.status === 'passed').length
  const totalFailed  = list.filter(e => e.status === 'failed').length
  const totalRetest  = list.filter(e => e.status === 'not_run' && e.retest_reason).length

  return (
    <Layout>
      <div className="page-header">
        <div className="page-hrow">
          <div>
            <div className="page-title">Execuções</div>
            <div className="page-sub">{list.length} execuções · {groups.length} casos</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Registrar Execução</button>
        </div>

        {/* Métricas rápidas */}
        {list.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'Passou', count: totalPassed, color: 'var(--green)', icon: '✅' },
              { label: 'Falhou', count: totalFailed, color: 'var(--red)', icon: '❌' },
              { label: 'Retest', count: totalRetest, color: 'var(--purple)', icon: '🔄' },
            ].map(m => (
              <div key={m.label} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20,
                fontSize: 13,
              }}>
                <span>{m.icon}</span>
                <span style={{ fontWeight: 700, color: m.color }}>{m.count}</span>
                <span style={{ color: 'var(--text-muted)' }}>{m.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 200 }} value={filter.cycle_id}
            onChange={e => setFilter(f => ({ ...f, cycle_id: e.target.value }))}>
            <option value="">Todos os ciclos</option>
            {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input" style={{ width: 160 }} value={filter.squad_id}
            onChange={e => setFilter(f => ({ ...f, squad_id: e.target.value }))}>
            <option value="">Todas as squads</option>
            {squads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" style={{ width: 140 }} value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">Todos status</option>
            {['passed', 'failed', 'blocked', 'skipped', 'in_progress', 'not_run'].map(s =>
              <option key={s} value={s}>{ST_LABEL[s]}</option>
            )}
          </select>
        </div>
      </div>

      {/* Lista agrupada */}
      {loading ? (
        <div>{[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 66, marginBottom: 8, borderRadius: 10 }} />)}</div>
      ) : groups.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon">▶</div>
            Nenhuma execução encontrada
          </div>
        </div>
      ) : (
        <div>{groups.map(g => (
          <CaseGroup key={g.case_id} group={g}
            onRetest={(exec, group) => { setRetestExec(exec); setRetestGroup(group); setRetestForm({ status: 'passed', duration_seconds: '', comments: '' }) }}
            onDetail={openDetail}
          />
        ))}</div>
      )}

      {/* Modal Registrar Execução */}
      {showNew && (
        <Modal title="Registrar Execução" onClose={() => setShowNew(false)}>
          <div className="form-group">
            <label className="form-label">Ciclo *</label>
            <select className="input" value={form.cycle_id} onChange={e => setForm({ ...form, cycle_id: e.target.value, test_case_id: '' })}>
              <option value="">Selecione um ciclo…</option>
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Caso de Teste *</label>
            <select className="input" value={form.test_case_id} onChange={e => setForm({ ...form, test_case_id: e.target.value })}>
              <option value="">Selecione um caso…</option>
              {cases.map(c => <option key={c.id} value={c.test_case_id || c.id}>{c.code} — {c.title}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Squad *</label>
            <select className="input" value={form.squad_id} onChange={e => setForm({ ...form, squad_id: e.target.value })}>
              <option value="">Selecione…</option>
              {squads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status *</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {['passed', 'failed', 'blocked', 'skipped', 'in_progress', 'not_run'].map(s =>
                  <option key={s} value={s}>{ST_LABEL[s]}</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="input" value={form.execution_type} onChange={e => setForm({ ...form, execution_type: e.target.value })}>
                <option value="manual">Manual</option>
                <option value="automated">Automatizado</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Duração (segundos)</label>
            <input className="input" type="number" value={form.duration_seconds}
              onChange={e => setForm({ ...form, duration_seconds: e.target.value })} placeholder="120" />
          </div>
          <div className="form-group">
            <label className="form-label">Comentários</label>
            <textarea className="input" rows={3} value={form.comments}
              onChange={e => setForm({ ...form, comments: e.target.value })} placeholder="Observações…" />
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}
              disabled={saving || !form.cycle_id || !form.test_case_id || !form.squad_id}>
              {saving && <span className="spinner spinner-sm" />}Registrar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Retest */}
      {retestExec && (
        <Modal title={`🔄 Retest — ${retestGroup?.case_title || ''}`} onClose={() => setRetestExec(null)}>
          <div style={{ background: 'var(--bg-base)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-pri)', fontSize: 14, marginBottom: 4 }}>
              {retestGroup?.case_title}
            </div>
            {retestGroup?.case_code && (
              <div style={{ fontFamily: 'monospace', color: 'var(--blue)', fontSize: 12, marginBottom: 4 }}>
                {retestGroup.case_code}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Retest solicitado após resolução do bug no Jira
            </div>
            {retestExec.retest_reason && (
              <div style={{ fontSize: 12, color: 'var(--purple)', marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                ↩ {retestExec.retest_reason}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Resultado *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'passed',  label: '✅ Passou',    color: '#22c55e' },
                { value: 'failed',  label: '❌ Falhou',    color: '#f43f5e' },
                { value: 'blocked', label: '⚠️ Bloqueado', color: '#eab308' },
              ].map(opt => (
                <button key={opt.value}
                  onClick={() => setRetestForm(f => ({ ...f, status: opt.value }))}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10,
                    border: `2px solid ${retestForm.status === opt.value ? opt.color : 'var(--border)'}`,
                    background: retestForm.status === opt.value ? opt.color + '22' : 'transparent',
                    color: retestForm.status === opt.value ? opt.color : 'var(--text-muted)',
                    cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all .15s'
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Duração (segundos)</label>
            <input className="input" type="number" value={retestForm.duration_seconds}
              onChange={e => setRetestForm(f => ({ ...f, duration_seconds: e.target.value }))} placeholder="60" />
          </div>
          <div className="form-group">
            <label className="form-label">Comentários</label>
            <textarea className="input" rows={3} value={retestForm.comments}
              onChange={e => setRetestForm(f => ({ ...f, comments: e.target.value }))}
              placeholder="Descreva o resultado do retest…" />
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setRetestExec(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveRetest} disabled={retestSaving}>
              {retestSaving && <span className="spinner spinner-sm" />}Registrar Retest
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Detalhe */}
      {detail && (
        <Modal title="Detalhes da Execução" onClose={() => setDetail(null)}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Badge text={detail.status} color={ST[detail.status] || 'gray'} />
            <Badge text={detail.execution_type} color="blue" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              ['Caso',          detail.test_case_title || '—'],
              ['Código',        detail.test_case_code || '—'],
              ['Duração',       fmtDur(detail.duration_seconds)],
              ['Executado por', detail.executed_by_name || '—'],
              ['Data',          fmt(detail.executed_at)],
              ['Bug Jira',      detail.jira_bug_key || '—'],
            ].map(([l, v]) => (
              <div key={l}>
                <div className="form-label" style={{ marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 13, color: 'var(--text-pri)', fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
          {detail.comments && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--text-sec)', fontStyle: 'italic' }}>
              "{detail.comments}"
            </div>
          )}
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setDetail(null)}>Fechar</button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
