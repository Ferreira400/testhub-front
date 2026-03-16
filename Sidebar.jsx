import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './src/context/AuthContext'
import './Sidebar.css'

const NAV = [
  { to:'/',           icon:'⬡', label:'Dashboard'      },
  { to:'/squads',     icon:'◈', label:'Squads'         },
  { to:'/projects',   icon:'▣', label:'Projetos'       },
  { to:'/test-cases', icon:'◎', label:'Casos de Teste' },
  { to:'/cycles',     icon:'↻', label:'Ciclos'         },
  { to:'/executions', icon:'▶', label:'Execuções'      },
  { to:'/reports',    icon:'◑', label:'Relatórios'     },
  { to:'/jira',       icon:'🔗', label:'Jira'           },  
  { to:'/bugs',   icon:'🐛', label:'Bugs'  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const goProfile = () => navigate('/profile')
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sb-header">
        <div className="sb-logo">
          <div className="sb-logomark">T</div>
          {!collapsed && <span className="sb-brand">TestHub</span>}
        </div>
        <button className="sb-toggle" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expandir' : 'Recolher'}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav className="sb-nav">
        {NAV.map(item => (
          <NavLink
            key={item.to} to={item.to} end={item.to === '/'}
            className={({ isActive }) => `sb-item${isActive ? ' active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <span className="sb-icon">{item.icon}</span>
            {!collapsed && <span className="sb-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sb-footer">
        {!collapsed && (
          <div className="sb-user" onClick={goProfile} style={{cursor:'pointer',borderRadius:8,padding:4,transition:'background .15s'}} title="Ver perfil">
            <div className="sb-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="sb-user-info">
              <div className="sb-user-name">{user?.name}</div>
              <div className="sb-user-role">{user?.role}</div>
            </div>
          </div>
        )}
        <button
          className="btn btn-ghost btn-sm"
          style={{ width:'100%', justifyContent:'center' }}
          onClick={() => logout()}
          title="Sair"
        >
          {collapsed ? '⏏' : '⏏  Sair'}
        </button>
      </div>
    </aside>
  )
}

