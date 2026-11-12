import * as React from 'react'
import { motion } from 'motion/react'
import { LayoutDashboard, Users, ScrollText, Settings, LogOut, Sun, Moon, Search, Command as CommandIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Logo, spring, easeOut } from '@/components/fx'

export function navItems(isAdmin) {
  return [
    { id: 'dashboard', label: '概览', icon: LayoutDashboard, hint: '服务状态与资源' },
    { id: 'users', label: isAdmin ? '用户' : '我的账号', icon: Users, hint: '账号, 流量与分享' },
    ...(isAdmin
      ? [
          { id: 'logs', label: '日志', icon: ScrollText, hint: '实时日志流' },
          { id: 'settings', label: '设置', icon: Settings, hint: '域名, 核心与偏好' },
        ]
      : []),
  ]
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

function Avatar({ name, className }) {
  return (
    <div
      className={cn(
        'bg-gradient-accent grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-medium uppercase text-accentInk shadow-[inset_0_1px_0_oklch(100%_0_0/0.35)]',
        className
      )}
    >
      {(name || '?').slice(0, 1)}
    </div>
  )
}

// 应用外壳: 桌面端玻璃侧栏, 移动端顶栏 + 底部标签栏
export function Shell({ view, setView, username, isAdmin, dark, onToggleTheme, onLogout, onOpenCommand, children }) {
  const nav = navItems(isAdmin)
  return (
    <div className="flex min-h-screen">
      {/* 桌面侧栏 */}
      <aside className="glass sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-rule md:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Logo className="h-7 w-7" />
          <div className="leading-tight">
            <div className="font-medium tracking-tight">trojan</div>
            <div className="text-[11px] text-muted">管理控制台</div>
          </div>
        </div>

        <div className="px-3">
          <button
            onClick={onOpenCommand}
            className="group flex h-9 w-full items-center gap-2 rounded-pill border border-rule bg-paper3/70 px-2.5 text-[13px] text-muted transition-colors hover:border-rule2 hover:text-ink2"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">搜索或执行…</span>
            <kbd className="measured rounded border border-rule bg-paper2 px-1.5 py-px text-[10px] text-muted">
              {isMac ? '⌘' : 'Ctrl'} K
            </kbd>
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          <div className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted/80">导航</div>
          {nav.map((item) => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  'relative flex w-full items-center gap-3 rounded-pill px-3 py-2 text-sm transition-colors',
                  active ? 'text-ink' : 'text-muted hover:text-ink2'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    transition={spring}
                    className="absolute inset-0 rounded-pill border border-rule2/70 bg-paper3 shadow-[inset_0_1px_0_oklch(100%_0_0/0.04)]"
                  >
                    <span className="bg-gradient-accent absolute left-0 top-1/2 h-4 w-[3px] -translate-x-[1px] -translate-y-1/2 rounded-full" />
                  </motion.span>
                )}
                <item.icon className={cn('relative h-[18px] w-[18px] transition-colors', active && 'text-accent')} />
                <span className="relative">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="m-3 rounded-card border border-rule bg-paper2/70 p-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar name={username} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium">{username}</div>
              <div className="text-[11px] text-muted">{isAdmin ? '管理员' : '普通用户'}</div>
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            <Button variant="ghost" size="sm" onClick={onToggleTheme} className="h-8 justify-center border border-rule bg-paper3/60">
              <ThemeIcon dark={dark} />
              {dark ? '浅色' : '深色'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} className="h-8 justify-center border border-rule bg-paper3/60 hover:text-bad">
              <LogOut />
              退出
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 移动端顶栏 */}
        <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-rule px-4 md:hidden">
          <Logo className="h-6 w-6" />
          <span className="flex-1 font-medium tracking-tight">trojan</span>
          <Button variant="ghost" size="iconSm" onClick={onOpenCommand} aria-label="命令面板">
            <CommandIcon />
          </Button>
          <Button variant="ghost" size="iconSm" onClick={onToggleTheme} aria-label="切换主题">
            <ThemeIcon dark={dark} />
          </Button>
          <Button variant="ghost" size="iconSm" onClick={onLogout} aria-label="退出登录">
            <LogOut />
          </Button>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:px-10 md:pb-10 md:pt-8">{children}</main>
      </div>

      {/* 移动端底部标签栏 */}
      <nav className="glass fixed inset-x-3 bottom-3 z-30 flex rounded-[18px] border border-rule2 p-1.5 shadow-[var(--shadow-pop)] md:hidden">
        {nav.map((item) => {
          const active = view === item.id
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn('relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]', active ? 'text-ink' : 'text-muted')}
            >
              {active && <motion.span layoutId="tab-active" transition={spring} className="absolute inset-0 rounded-[13px] bg-paper3" />}
              <item.icon className={cn('relative h-5 w-5', active && 'text-accent')} />
              <span className="relative">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function ThemeIcon({ dark }) {
  return (
    <motion.span
      key={dark ? 'sun' : 'moon'}
      initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={spring}
      className="inline-flex"
    >
      {dark ? <Sun /> : <Moon />}
    </motion.span>
  )
}

export function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: easeOut }}
      className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[12px] font-medium text-accent">{eyebrow}</div>}
        <h1 className="text-[28px] leading-tight md:text-[32px]">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </motion.div>
  )
}
