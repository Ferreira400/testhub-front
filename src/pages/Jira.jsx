/**
 * src/pages/Jira.jsx
 * Painel de integração Jira com geração de Gherkin + salvar no banco
 */
import React, { useState, useEffect } from 'react'
import api from '../services/api'

export default function Jira() {
  const [links,      setLinks]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [jiraKey,    setJiraKey]    = useState('')
  const [gherkin,    setGherkin]    = useState(null)
  const [genLoading, setGenLoad]    = useState(false)
  const [projects,   setProjects]   = useState([])
  const [squads,     setSquads]     = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedSquad,   setSelectedSquad]   = useState('')
  const [saveLoading, setSaveLoad]  = useState(false)
  const [saveMsg,     setSaveMsg]   = useState('')

  useEffect(() => {
    api.get('/jira/links').then(r => setLinks(r.data)).catch(() => {}).finally(() => setLoading(false))
    api.get('/projects').then(r => { setProjects(r.data || []); if (r.data?.[0]) setSelectedProject(r.data[0].id) })
    api.get('/squads').then(r => { setSquads(r.data || []); if (r.data?.[0]) setSelectedSquad(r.data[0].id) })
  }, [])

  const generateGherkin = async () => {
    if (!jiraKey.trim()) return
    setGenLoad(true); setGherkin(null); setSaveMsg('')
    try {
      const { data } = await api.get(`/jira/generate/${jiraKey.trim()}`)
      setGherkin(data)
    } catch (e) {
      alert('Erro: ' + (e.response?.data?.error || e.message))
    } finally { setGenLoad(false) }
  }

  const saveToTestHub = async () => {
    if (!gherkin || !selectedProject) return
    setSaveLoad(true); setSaveMsg('')
    try {
      const { data } = await api.post('/jira/save-cases', {
        jiraKey:   gherkin.jiraKey,
        summary:   gherkin.summary,
        gherkinJson: gherkin.gherkinJson,
        projectId: selectedProject,
        squadId:   selectedSquad,
      })
      setSaveMsg(`✅ ${data.count} casos criados no TestHub — Squad: ${squads.find(s => s.id === selectedSquad)?.name || ''}`)
      // Atualiza lista de links
      api.get('/jira/links').then(r => setLinks(r.data))
    } catch (e) {
      setSaveMsg('❌ ' + (e.response?.data?.error || e.message))
    } finally { setSaveLoad(false) }
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-pri)' }}>🔗 Integração Jira</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Sincronização bidirecional — histórias, cenários Gherkin e notificações
        </div>
      </div>

      {/* Gerador de Gherkin */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>🤖 Gerar Cenários Gherkin por Story</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Chave da Story (ex: TH-15)"
            value={jiraKey}
            onChange={e => setJiraKey(e.target.value.toUpperCase())}
            style={{ maxWidth: 220 }}
            onKeyDown={e => e.key === 'Enter' && generateGherkin()}
          />
          <button className="btn btn-primary" onClick={generateGherkin} disabled={genLoading || !jiraKey.trim()}>
            {genLoading ? '⏳ Gerando...' : '✨ Gerar com IA'}
          </button>
        </div>

        {gherkin && (
          <div>
            {/* Info da story */}
            <div style={{ marginBottom: 14, color: 'var(--text-sec)', fontSize: 13 }}>
              <strong>{gherkin.jiraKey}</strong> — {gherkin.summary}
              &nbsp;·&nbsp; <span style={{ color: 'var(--green)' }}>✅ {gherkin.scenarios} cenários gerados</span>
            </div>

            {/* Seleção de destino */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>PROJETO</label>
                <select className="input" style={{ width: 200 }} value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>SQUAD</label>
                <select className="input" style={{ width: 200 }} value={selectedSquad} onChange={e => setSelectedSquad(e.target.value)}>
                  <option value="">Sem squad</option>
                  {squads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>&nbsp;</label>
                <button
                  className="btn btn-primary"
                  onClick={saveToTestHub}
                  disabled={saveLoading || !selectedProject}
                  style={{ height: 38 }}
                >
                  {saveLoading ? '⏳ Salvando...' : '💾 Salvar no TestHub'}
                </button>
              </div>
            </div>

            {saveMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: 6, marginBottom: 12, fontSize: 13,
                background: saveMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.1)',
                color: saveMsg.startsWith('✅') ? 'var(--green)' : 'var(--red)',
                border: `1px solid ${saveMsg.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(244,63,94,0.3)'}`,
              }}>
                {saveMsg}
              </div>
            )}

            {/* Preview Gherkin */}
            <pre style={{
              background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8,
              padding: 16, fontSize: 12, color: 'var(--text-sec)', overflowX: 'auto',
              maxHeight: 400, overflowY: 'auto',
            }}>
              {gherkin.gherkinText}
            </pre>

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(gherkin.gherkinText)}>
                📋 Copiar Gherkin
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const blob = new Blob([gherkin.gherkinText], { type: 'text/plain' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `${gherkin.jiraKey}.feature`
                a.click()
              }}>
                ⬇️ Baixar .feature
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Histórias Vinculadas */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>📋 Histórias Vinculadas</div>
        {loading ? (
          <div className="skel" style={{ height: 120 }} />
        ) : links.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔗</div>
            Nenhuma história vinculada ainda.
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              Configure o webhook no Jira para sincronização automática.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Jira Key', 'Resumo', 'Projeto', 'Squad', 'Gherkin', 'Criado em'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {links.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <a
                      href={`${import.meta.env.VITE_JIRA_URL}/browse/${l.jira_key}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      {l.jira_key}
                    </a>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-sec)', maxWidth: 280 }}>{l.jira_summary}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{l.project_name}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{l.squad_name}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {l.gherkin_generated
                      ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>✅ Gerado</span>
                      : <button className="btn btn-ghost btn-sm" onClick={() => { setJiraKey(l.jira_key); window.scrollTo(0,0) }}>Gerar</button>}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                    {new Date(l.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
