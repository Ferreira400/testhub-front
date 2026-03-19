import React, { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'

const downloadTemplate = () => {
  const headers = [['Capacidade','Dominio','Sub dominio','Produto','Aplicacao','Processo de negocios','impacto','componentes']]
  const example = [
    ['Produtos','Credito','Financiamento','Veiculos','Rover','captura de proposta, formalizacao','medio','api--veiculos, api--consignado'],
    ['Suporte','Risco','Emprestimo','Consignado','comissoes','Saldo conta, proposta ep','baixo','web--veiculos-mobile'],
    ['Canais','Mobile','Financiamento','cartao','Garantias','Atendimento bacen, chat','medio','app--risco-api'],
  ]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([...headers, ...example])
  ws['!cols'] = [15,15,18,15,15,45,12,45].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws, 'Unidades de Negocio')
  XLSX.writeFile(wb, 'TestHub_Modelo_Unidades_Negocio.xlsx')
}
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Layout from '../../Layout'

const IMPACTO_CONFIG = {
  alto:  { label: 'Alto',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  medio: { label: 'Medio', color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  baixo: { label: 'Baixo', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
}

const Badge = ({ value }) => {
  const c = IMPACTO_CONFIG[value] || { label: value, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.color, border: `1px solid ${c.color}44`, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  )
}

const emptyForm = {
  capacidade: '', dominio: '', sub_dominio: '', produto: '',
  aplicacao: '', processo_negocio: '', impacto: 'medio', componentes: '',
}

export default function BusinessUnits() {
  const { isAdmin, isManager } = useAuth()
  const canWrite = isAdmin() || isManager()

  const [units,         setUnits]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [modal,         setModal]         = useState(false)
  const [editing,       setEditing]       = useState(null)
  const [form,          setForm]          = useState(emptyForm)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const [search,        setSearch]        = useState('')
  const [filterImpacto, setFilterImpacto] = useState('')
  const [showInativos, setShowInativos] = useState(false)
  const [importing,     setImporting]     = useState(false)
  const [importResult,  setImportResult]  = useState(null)
  const fileRef = useRef()

  useEffect(() => { loadUnits() }, [showInativos])

  const loadUnits = async () => {
    setLoading(true)
    try {
      const res = await api.get('/business-units?ativo=' + (showInativos ? 'all' : '1'))
      setUnits(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setModal(true) }
  const openEdit   = (u)  => {
    setEditing(u)
    setForm({ capacidade: u.capacidade, dominio: u.dominio, sub_dominio: u.sub_dominio,
              produto: u.produto, aplicacao: u.aplicacao, processo_negocio: u.processo_negocio,
              impacto: u.impacto, componentes: u.componentes })
    setError(''); setModal(true)
  }

  const save = async () => {
    const req = ['capacidade','dominio','sub_dominio','produto','aplicacao','processo_negocio','componentes']
    if (req.some(k => !form[k]?.trim())) { setError('Preencha todos os campos obrigatorios'); return }
    setSaving(true); setError('')
    try {
      editing ? await api.put(`/business-units/${editing.id}`, form)
              : await api.post('/business-units', form)
      setModal(false); loadUnits()
    } catch (e) { setError(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const toggleAtivo = async (u) => {
    try { await api.put(`/business-units/${u.id}`, { ativo: u.ativo ? 0 : 1 }); loadUnits() }
    catch (e) { console.error(e) }
  }

  // Importa planilha XLSX ou CSV via FileReader + parse simples
 const handleImport = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  setImporting(true); setImportResult(null)
  try {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

    const FIELD_MAP = {
      capacidade:       ['capacidade','Capacidade'],
      dominio:          ['dominio','Dominio','Domínio'],
      sub_dominio:      ['sub_dominio','sub dominio','Sub dominio','Sub Domínio'],
      produto:          ['produto','Produto'],
      aplicacao:        ['aplicacao','Aplicacao','Aplicação'],
      processo_negocio: ['processo_negocio','processo de negocios','Processo de negocios','Processo de Negócios'],
      impacto:          ['impacto','Impacto'],
      componentes:      ['componentes','Componentes'],
    }

    let ok = 0; let erros = []
    for (const row of rows) {
      const mapped = {}
      for (const [field, aliases] of Object.entries(FIELD_MAP)) {
        const key = Object.keys(row).find(k => aliases.some(a => k.toLowerCase() === a.toLowerCase()))
        mapped[field] = key ? String(row[key]).trim() : ''
      }
      if (!mapped.capacidade || !mapped.dominio || !mapped.produto) {
        erros.push(`Linha ignorada: capacidade/dominio/produto em branco`)
        continue
      }
      if (!['alto','medio','baixo'].includes((mapped.impacto||'').toLowerCase())) mapped.impacto = 'medio'
      else mapped.impacto = mapped.impacto.toLowerCase()
      try {
        await api.post('/business-units', mapped)
        ok++
      } catch (err) {
        erros.push(`Erro ao importar ${mapped.capacidade}: ${err.response?.data?.error || err.message}`)
      }
    }
    setImportResult({ ok, erros })
    loadUnits()
  } catch (err) {
    setImportResult({ error: 'Erro ao ler arquivo: ' + err.message })
  } finally {
    setImporting(false)
    e.target.value = ''
  }
}

  const filtered = units.filter(u => {
    const q = search.toLowerCase()
    const m = !q || [u.capacidade,u.dominio,u.produto,u.aplicacao,u.componentes].some(v => v?.toLowerCase().includes(q))
    return m && (!filterImpacto || u.impacto === filterImpacto)
  })

  return (
    <Layout>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'var(--text-pri)', margin:0 }}>Unidades de Negocio</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'4px 0 0' }}>
            {filtered.length} unidade{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canWrite && (
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-ghost btn-sm" onClick={downloadTemplate} style={{ fontSize:11 }}>Baixar Modelo</button>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()} disabled={importing}>
              {importing ? 'Importando...' : 'Importar CSV/XLSX'}
            </button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:'none' }} onChange={handleImport} />
            <button className="btn btn-primary" onClick={openCreate}>+ Nova Unidade</button>
          </div>
        )}
      </div>

      {/* Resultado de importacao */}
      {importResult && (
        <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:10,
          background: importResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${importResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
          {importResult.error ? (
            <p style={{ color:'var(--red)', margin:0, fontSize:13 }}>{importResult.error}</p>
          ) : (
            <>
              <p style={{ color:'var(--green)', margin:'0 0 4px', fontSize:13, fontWeight:700 }}>
                {importResult.ok} unidade{importResult.ok !== 1 ? 's' : ''} importada{importResult.ok !== 1 ? 's' : ''} com sucesso!
              </p>
              {importResult.erros?.map((e, i) => (
                <p key={i} style={{ color:'var(--red)', margin:0, fontSize:11 }}>{e}</p>
              ))}
            </>
          )}
          <button className="btn btn-ghost btn-xs" style={{ marginTop:6 }} onClick={() => setImportResult(null)}>Fechar</button>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <input className="input" placeholder="Buscar por capacidade, produto, componente..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ flex:1, minWidth:240 }} />
        <button className={`btn btn-sm ${showInativos ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setShowInativos(v => !v)}>
          {showInativos ? 'Ocultar desativados' : 'Ver desativados'}
        </button>
        <select className="input" value={filterImpacto} onChange={e => setFilterImpacto(e.target.value)} style={{ width:160 }}>
          <option value="">Todos (impacto)</option>
          <option value="alto">Alto</option>
          <option value="medio">Medio</option>
          <option value="baixo">Baixo</option>
        </select>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:48 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🏢</div>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--text-sec)' }}>Nenhuma unidade encontrada</div>
          {canWrite && <button className="btn btn-primary btn-sm" style={{ marginTop:16 }} onClick={openCreate}>+ Criar primeira unidade</button>}
        </div>
      ) : (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
            <thead>
              <tr style={{ background:'var(--bg-elevated)' }}>
                {['Capacidade','Dominio','Sub Dominio','Produto','Aplicacao','Impacto','Componentes','Casos',''].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.05em', whiteSpace:'nowrap' }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ borderTop:'1px solid var(--border)', background: i%2===0 ? 'transparent':'rgba(255,255,255,0.01)', opacity: u.ativo ? 1 : 0.5 }}>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color:'var(--text-pri)' }}>{u.capacidade}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'var(--text-sec)' }}>{u.dominio}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'var(--text-sec)' }}>{u.sub_dominio}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'var(--text-sec)' }}>{u.produto}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'var(--text-sec)' }}>{u.aplicacao}</td>
                  <td style={{ padding:'12px 14px' }}><Badge value={u.impacto} /></td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {u.componentes?.split(',').map(c => (
                        <span key={c} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, padding:'2px 7px', fontSize:10, fontWeight:600 }}>
                          {c.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px', textAlign:'center', fontWeight:700, fontSize:14, color: u.total_cases > 0 ? 'var(--blue)':'var(--text-muted)' }}>
                    {u.total_cases}
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    {canWrite && (
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(u)}>Editar</button>
                        <button className="btn btn-ghost btn-xs" style={{ color: u.ativo ? 'var(--red)':'var(--green)' }}
                          onClick={() => toggleAtivo(u)}>{u.ativo ? 'Desativar':'Ativar'}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal — fora do fluxo normal, fixed no viewport */}
      {modal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setModal(false) }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:9999,
            display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16,
              padding:28, width:'100%', maxWidth:640, maxHeight:'85vh', overflowY:'auto',
              position:'relative', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>

            {/* Header modal */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text-pri)', margin:0 }}>
                {editing ? 'Editar Unidade de Negocio' : 'Nova Unidade de Negocio'}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}
                style={{ fontSize:18, lineHeight:1, padding:'2px 8px' }}>x</button>
            </div>

            {/* Campos 2 colunas */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
              {[
                { label:'Capacidade',  k:'capacidade',  ph:'ex: Produtos, Suporte, Canais' },
                { label:'Dominio',     k:'dominio',     ph:'ex: Credito, Risco, Mobile' },
                { label:'Sub Dominio', k:'sub_dominio', ph:'ex: Financiamento, Emprestimo' },
                { label:'Produto',     k:'produto',     ph:'ex: Veiculos, Consignado, Cartao' },
                { label:'Aplicacao',   k:'aplicacao',   ph:'ex: Rover, comissoes, Garantias' },
              ].map(({ label, k, ph }) => (
                <div key={k} style={{ marginBottom:14 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.04em', display:'block', marginBottom:5 }}>
                    {label.toUpperCase()} <span style={{ color:'var(--red)' }}>*</span>
                  </label>
                  <input className="input" placeholder={ph} value={form[k]}
                    onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}

              {/* Impacto */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.04em', display:'block', marginBottom:5 }}>
                  IMPACTO <span style={{ color:'var(--red)' }}>*</span>
                </label>
                <select className="input" value={form.impacto} onChange={e => setForm(f => ({ ...f, impacto: e.target.value }))}>
                  <option value="alto">Alto</option>
                  <option value="medio">Medio</option>
                  <option value="baixo">Baixo</option>
                </select>
              </div>
            </div>

            {/* Textarea campos full width */}
            {[
              { label:'Processo de Negocio', k:'processo_negocio', ph:'ex: captura de proposta, formalizacao, saldo conta...' },
              { label:'Componentes',         k:'componentes',      ph:'ex: api--veiculos, web--consignado-app, app--risco-api' },
            ].map(({ label, k, ph }) => (
              <div key={k} style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.04em', display:'block', marginBottom:5 }}>
                  {label.toUpperCase()} <span style={{ color:'var(--red)' }}>*</span>
                </label>
                <textarea className="input" rows={3} placeholder={ph} value={form[k]}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  style={{ resize:'vertical', minHeight:72 }} />
              </div>
            ))}

            {error && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13, color:'var(--red)' }}>
                {error}
              </div>
            )}

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Salvando...' : editing ? 'Salvar alteracoes' : 'Criar unidade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}




