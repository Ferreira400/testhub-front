import React from 'react'
import Sidebar from './Sidebar'
import './Layout.css'

export default function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-main">
        <div className="layout-content fade-up">
          {children}
        </div>
      </main>
    </div>
  )
}
