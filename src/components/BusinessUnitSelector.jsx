// ================================================================
//  BusinessUnitSelector — Componente para usar no formulário de
//  Casos de Teste. Coloque em: src/components/BusinessUnitSelector.jsx
// ================================================================
import React, { useState, useEffect } from 'react'
import api from '../services/api'

const IMPACTO_CONFIG = {
  alto:  { label: 'Alto',  color: '#ef4444' },
  medio: { label: 'Médio', color: '#eab308' },
  baixo: { label: 'Baixo', color: '#22c55e' },
}

export default function BusinessUnitSelector({ value, onChange, required = true, error }) {
  const [units,    setUnits]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/business-units').then(res => {
      setUnits(res.data.filter(u => u.ativo))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (value && units.length) {
      setSelected(units.find(u => u.id === value) || null)
    } else {
      setSelected(null)
    }
  }, [value, units])

  const handleChange = (e) => {
    const id = e.target.value
    onChange(id)
    setSelected(units.find(u => u.id === id) || null)
  }

  return (
    <div>
      <label style={{
        fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
        letterSpacing: '.04em', display: 'block', marginBottom: 5
      }}>
        UNIDADE DE NEGÓCIO {required && <span style={{ color: 'var(--red)' }}>*</span>}
      </label>

      <select
        className={`input${error ? ' input-error' : ''}`}
        value={value || ''}
        onChange={handleChange}
        disabled={loading}
        style={{ borderColor: error ? 'var(--red)' : undefined }}
      >
        <option value="">
          {loading ? 'Carregando...' : '-- Selecione uma Unidade de Negócio --'}
        </option>
        {units.map(u => (
          <option key={u.id} value={u.id}>
            {u.capacidade} › {u.dominio} › {u.produto} — {u.aplicacao}
          </option>
        ))}
      </select>

      {error && (
        <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, display: 'block' }}>{error}</span>
      )}

      {/* Preview da unidade selecionada */}
      {selected && (
        <div style={{
          marginTop: 8, padding: '10px 14px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px',
        }}>
          {[
            ['Capacidade',  selected.capacidade],
            ['Domínio',     selected.dominio],
            ['Sub Domínio', selected.sub_dominio],
            ['Produto',     selected.produto],
            ['Aplicação',   selected.aplicacao],
            ['Impacto',     selected.impacto],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, minWidth: 80 }}>{label}:</span>
              {label === 'Impacto' ? (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20,
                  color: IMPACTO_CONFIG[val]?.color, background: `${IMPACTO_CONFIG[val]?.color}22`,
                }}>{IMPACTO_CONFIG[val]?.label}</span>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-sec)', fontWeight: 600 }}>{val}</span>
              )}
            </div>
          ))}
          {selected.componentes && (
            <div style={{ gridColumn: '1/-1', marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginRight: 2 }}>Componentes:</span>
              {selected.componentes.split(',').map(c => (
                <span key={c} style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 6,
                  background: 'rgba(79,124,255,0.1)', color: 'var(--blue)',
                  border: '1px solid rgba(79,124,255,0.2)',
                }}>{c.trim()}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
