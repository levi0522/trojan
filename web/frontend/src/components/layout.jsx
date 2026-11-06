import * as React from 'react'
import { LayoutDashboard, Users, ScrollText, Settings, LogOut, Sun, Moon, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// 应用外壳: 左侧发线导航栏 + 内容区
export function Shell({ view, setView, username, isAdmin, dark, onToggleTheme, onLogout, children }) {
  const nav = [
    { id: 'dashboard', label: '概览', icon: LayoutDashboard },
    { id: 'users', label: isAdmin ? '用户' : '我的账号', icon: Users },
    ...(isAdmin
      ? [
          { id: 'logs', label: '日志', icon: ScrollText },
          { id: 'settings', label: '设置', icon: Settings },
        ]
      : []),
  ]
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-52 shrink-0 flex-col border-r border-rule bg-paper2">
        <div className="flex h-14 items-center gap-2 border-b border-rule px-5">
          <Terminal className="h-4 w-4 text-accent" />
          <span className="font-medium tracking-tight">trojan</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-pill px-3 py-2 text-sm transition-colors',
                view === item.id ? 'bg-coolSoft text-cool' : 'text-ink2 hover:bg-paper3'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-rule p-3">
          <div className="mb-2 truncate px-3 text-[13px] text-muted">{username}</div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onToggleTheme} title={dark ? '切换到浅色' : '切换到深色'}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout} title="退出登录">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-6">{children}</main>
    </div>
  )
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}
