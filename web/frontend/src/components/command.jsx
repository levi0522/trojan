import * as React from 'react'
import { Command } from 'cmdk'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { CornerDownLeft, LogOut, Moon, Play, Plus, RotateCw, Search, Square, Sun } from 'lucide-react'
import { navItems } from '@/components/layout'
import { useToast } from '@/components/ui/toast'
import { call } from '@/lib/api'

// ⌘K 命令面板: 跳转页面 / 控制服务 / 新增用户 / 切换主题
export function CommandPalette({ open, setOpen, isAdmin, setView, dark, onToggleTheme, onLogout, onIntent }) {
  const toast = useToast()

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  const run = (fn) => () => {
    setOpen(false)
    fn()
  }

  async function service(action, label) {
    toast.info(`正在${label}…`)
    try {
      await call('/trojan/' + action, { method: 'POST', form: {} })
      toast.success(`trojan 已${label}`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay-dim fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[14vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-[16px] border border-rule2 bg-paper2/95 shadow-[var(--shadow-pop)] backdrop-blur-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-left-1/2"
        >
          <DialogPrimitive.Title className="sr-only">命令面板</DialogPrimitive.Title>
          <Command loop className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted">
            <div className="flex items-center gap-2.5 border-b border-rule px-4">
              <Search className="h-4 w-4 text-muted" />
              <Command.Input
                autoFocus
                placeholder="输入命令或页面名称…"
                className="flex-1 bg-transparent py-4 text-[15px] text-ink outline-none placeholder:text-muted focus-visible:outline-none"
              />
              <kbd className="measured rounded border border-rule bg-paper3 px-1.5 py-px text-[10px] text-muted">ESC</kbd>
            </div>
            <Command.List className="scrollbar-thin max-h-[min(60vh,380px)] overflow-y-auto p-2 transition-[height] duration-200">
              <Command.Empty className="py-10 text-center text-sm text-muted">没有匹配的命令</Command.Empty>

              <Command.Group heading="跳转">
                {navItems(isAdmin).map((n) => (
                  <Item key={n.id} icon={n.icon} label={n.label} hint={n.hint} keywords={[n.id]} onSelect={run(() => setView(n.id))} />
                ))}
              </Command.Group>

              {isAdmin && (
                <Command.Group heading="操作">
                  <Item icon={Plus} label="新增用户" keywords={['add', 'user', 'xinzeng']} onSelect={run(() => onIntent('add-user'))} />
                  <Item icon={RotateCw} label="重启 trojan" keywords={['restart', 'chongqi']} onSelect={run(() => service('restart', '重启'))} />
                  <Item icon={Play} label="启动 trojan" keywords={['start', 'qidong']} onSelect={run(() => service('start', '启动'))} />
                  <Item icon={Square} label="停止 trojan" keywords={['stop', 'tingzhi']} onSelect={run(() => service('stop', '停止'))} />
                </Command.Group>
              )}

              <Command.Group heading="偏好">
                <Item icon={dark ? Sun : Moon} label={dark ? '切换到浅色主题' : '切换到深色主题'} keywords={['theme', 'dark', 'light']} onSelect={run(onToggleTheme)} />
                <Item icon={LogOut} label="退出登录" keywords={['logout']} onSelect={run(onLogout)} />
              </Command.Group>
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Item({ icon: Icon, label, hint, keywords, onSelect }) {
  return (
    <Command.Item
      value={label}
      keywords={keywords}
      onSelect={onSelect}
      className="group flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-ink2 outline-none transition-colors data-[selected=true]:bg-paper3 data-[selected=true]:text-ink"
    >
      <span className="grid h-8 w-8 place-items-center rounded-pill border border-rule bg-paper3 text-muted transition-colors group-data-[selected=true]:border-accent/40 group-data-[selected=true]:text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1">{label}</span>
      {hint && <span className="hidden text-[12px] text-muted sm:inline">{hint}</span>}
      <CornerDownLeft className="h-3.5 w-3.5 text-muted opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
    </Command.Item>
  )
}
