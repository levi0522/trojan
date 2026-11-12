import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Shell } from '@/components/layout'
import { CommandPalette } from '@/components/command'
import { Logo, PageTransition } from '@/components/fx'
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
  const [cmdOpen, setCmdOpen] = useState(false)
  const [intent, setIntent] = useState(null)
  const pointer = useRef({ x: window.innerWidth / 2, y: 0 })

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('trojan_theme', dark ? 'dark' : 'light')
  }, [dark])

  // 记录最近一次点击位置, 作为主题切换扩散的圆心
  useEffect(() => {
    const onDown = (e) => (pointer.current = { x: e.clientX, y: e.clientY })
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [])

  // 主题切换: 支持 View Transitions 的浏览器从点击处圆形扩散, 其余直接切换
  const toggleTheme = useCallback(() => {
    const flip = () => setDark((v) => !v)
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return flip()
    const { x, y } = pointer.current
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const t = document.startViewTransition(() => flushSync(flip))
    t.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
      )
    })
  }, [])

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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <motion.div animate={{ scale: [1, 1.08, 1], rotate: [0, -4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
          <Logo className="h-12 w-12 drop-shadow-[0_8px_24px_var(--color-accent)]" />
        </motion.div>
        <div className="text-[13px] text-muted">载入中…</div>
      </div>
    )
  }

  if (stage === 'setup' || stage === 'login') {
    return (
      <Login
        mode={stage}
        title={title}
        onLogin={(name) => {
          setUsername(name)
          setView('dashboard')
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
        onToggleTheme={toggleTheme}
        onLogout={logout}
        onOpenCommand={() => setCmdOpen(true)}
      >
        <AnimatePresence mode="wait">
          <PageTransition key={view}>
            {view === 'dashboard' && <Dashboard isAdmin={isAdmin} />}
            {view === 'users' && <Users isAdmin={isAdmin} intent={intent} clearIntent={() => setIntent(null)} />}
            {view === 'logs' && isAdmin && <Logs />}
            {view === 'settings' && isAdmin && <Settings />}
          </PageTransition>
        </AnimatePresence>
      </Shell>
      <CommandPalette
        open={cmdOpen}
        setOpen={setCmdOpen}
        isAdmin={isAdmin}
        setView={setView}
        dark={dark}
        onToggleTheme={toggleTheme}
        onLogout={logout}
        onIntent={(i) => {
          setIntent(i)
          setView('users')
        }}
      />
    </ToastProvider>
  )
}
