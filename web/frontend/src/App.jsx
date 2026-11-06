import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Shell } from '@/components/layout'
import { ToastProvider } from '@/components/ui/toast'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Users from '@/pages/Users'
import Logs from '@/pages/Logs'
import Settings from '@/pages/Settings'
import { getToken, request, setToken } from '@/lib/api'

// 认证门: check -> login/setup -> 主界面
export default function App() {
  // stage: loading | setup | login | ready
  const [stage, setStage] = useState('loading')
  const [title, setTitle] = useState('')
  const [username, setUsername] = useState('')
  const [view, setView] = useState('dashboard')
  const [dark, setDark] = useState(() => localStorage.getItem('trojan_theme') !== 'light')

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('trojan_theme', dark ? 'dark' : 'light')
  }, [dark])

  const logout = useCallback(() => {
    request('/auth/logout', { method: 'POST' }).catch(() => {})
    setToken('')
    setUsername('')
    setStage('login')
  }, [])

  useEffect(() => {
    const onExpired = () => setStage((s) => (s === 'ready' ? 'login' : s))
    window.addEventListener('trojan:unauthorized', onExpired)
    return () => window.removeEventListener('trojan:unauthorized', onExpired)
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const resp = await fetch('/auth/check', { credentials: 'same-origin' })
        const data = await resp.json()
        if (data?.data?.title) {
          setTitle(data.data.title)
          document.title = data.data.title
        }
        if (resp.status === 201) {
          setStage('setup')
          return
        }
        if (getToken()) {
          // 已有 token, 验证有效性
          try {
            const me = await request('/auth/loginUser')
            setUsername(me?.data?.username || 'admin')
            setStage('ready')
            return
          } catch {
            setToken('')
          }
        }
        setStage('login')
      } catch {
        setStage('login')
      }
    })()
  }, [])

  if (stage === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted">载入中…</div>
  }

  if (stage === 'setup' || stage === 'login') {
    return (
      <Login
        mode={stage}
        title={title}
        onLogin={(name) => {
          setUsername(name)
          setStage('ready')
        }}
      />
    )
  }

  const isAdmin = username === 'admin'

  return (
    <ToastProvider>
      <Shell
        view={view}
        setView={setView}
        username={username}
        isAdmin={isAdmin}
        dark={dark}
        onToggleTheme={() => setDark((v) => !v)}
        onLogout={logout}
      >
        {view === 'dashboard' && <Dashboard isAdmin={isAdmin} />}
        {view === 'users' && <Users isAdmin={isAdmin} />}
        {view === 'logs' && isAdmin && <Logs />}
        {view === 'settings' && isAdmin && <Settings />}
      </Shell>
    </ToastProvider>
  )
}
