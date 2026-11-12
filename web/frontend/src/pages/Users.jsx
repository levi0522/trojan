import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eraser,
  Eye,
  EyeOff,
  Gauge,
  MoreHorizontal,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserRound,
  Users as UsersIcon,
  X,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/layout'
import { Bytes, Num, Stagger, StaggerItem, easeOut, spring } from '@/components/fx'
import { call, getToken } from '@/lib/api'
import { bytefmt, decodePass, quotaText } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

function randomStr(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const buf = new Uint32Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf, (n) => chars[n % chars.length]).join('')
}

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

// 复制按钮: 复制后图标变为对勾
function CopyButton({ text, className, label = '复制', size = 'iconSm', variant = 'ghost' }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      title={label}
      aria-label={label}
      className={className}
      onClick={async (e) => {
        e.stopPropagation()
        await writeClipboard(text)
        setDone(true)
        setTimeout(() => setDone(false), 1400)
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={done ? 'ok' : 'copy'}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="inline-flex"
        >
          {done ? <Check className="text-ok" /> : <Copy />}
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}

// 用户状态推导
function userState(u) {
  const quota = Number(u.Quota)
  const used = Number(u.Upload) + Number(u.Download)
  const days = Number(u.UseDays)
  let left = null
  if (days !== 0 && u.ExpiryDate) {
    const end = new Date(u.ExpiryDate + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    left = Math.round((end - today) / 86400000)
  }
  return {
    disabled: quota === 0,
    unlimited: quota < 0,
    used,
    ratio: quota > 0 ? Math.min(1, used / quota) : 0,
    left,
    expiring: left !== null && left >= 0 && left <= 7,
  }
}

const HUES = [245, 80, 150, 25, 300, 190]
function UserAvatar({ name }) {
  const h = HUES[[...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]
  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-medium uppercase"
      style={{ background: `oklch(0.75 0.12 ${h} / 0.18)`, color: `oklch(0.78 0.13 ${h})`, boxShadow: `inset 0 0 0 1px oklch(0.75 0.12 ${h} / 0.3)` }}
    >
      {(name || '?').slice(0, 1)}
    </span>
  )
}

export default function Users({ isAdmin, intent, clearIntent }) {
  const toast = useToast()
  const [users, setUsers] = useState(null)
  const [domain, setDomain] = useState('')
  const [port, setPort] = useState(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState(null) // {type: 'add'|'edit'|'share'|'quota'|'expire'|'delete', user?}
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const data = await call('/trojan/user')
      setUsers(data.userList || [])
      setDomain(data.domain)
      setPort(data.port)
    } catch (e) {
      toast.error(e.message)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (intent === 'add-user' && isAdmin) {
      setDialog({ type: 'add' })
      clearIntent?.()
    }
  }, [intent, isAdmin, clearIntent])

  const shareInfo = useCallback(
    (user) => {
      const pass = decodePass(user.Password)
      const remark = encodeURIComponent(`${domain}:${port}`)
      const link = `trojan://${pass}@${domain}:${port}#${remark}`
      const subToken = btoa(unescape(encodeURIComponent(JSON.stringify({ user: user.Username, pass }))))
      const sub = `${location.origin}/trojan/user/subscribe?token=${subToken}`
      return { pass, link, sub }
    },
    [domain, port]
  )

  async function run(fn, okMsg) {
    setBusy(true)
    try {
      await fn()
      if (okMsg) toast.success(okMsg)
      setDialog(null)
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function importCsv(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const resp = await fetch('/trojan/import', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + getToken() },
        body: form,
        credentials: 'same-origin',
      })
      const data = await resp.json()
      if (data.Msg && data.Msg !== 'success') throw new Error(data.Msg)
      toast.success('导入完成')
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const stats = useMemo(() => {
    const list = users || []
    return list.reduce(
      (acc, u) => {
        const s = userState(u)
        acc.up += Number(u.Upload)
        acc.down += Number(u.Download)
        if (s.disabled) acc.disabled++
        if (s.expiring) acc.expiring++
        return acc
      },
      { total: list.length, up: 0, down: 0, disabled: 0, expiring: 0 }
    )
  }, [users])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (users || []).filter((u) => {
      if (q && !u.Username.toLowerCase().includes(q)) return false
      const s = userState(u)
      if (filter === 'active') return !s.disabled
      if (filter === 'disabled') return s.disabled
      if (filter === 'limited') return s.left !== null
      return true
    })
  }, [users, query, filter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

  useEffect(() => setPage(1), [query, filter])

  const actions = {
    share: (u) => setDialog({ type: 'share', user: u }),
    edit: (u) => setDialog({ type: 'edit', user: u }),
    quota: (u) => setDialog({ type: 'quota', user: u }),
    expire: (u) => setDialog({ type: 'expire', user: u }),
    clean: (u) => run(() => call(`/trojan/data?id=${u.ID}`, { method: 'DELETE' }), '已清空流量'),
    cancelExpire: (u) => run(() => call(`/trojan/user/expire?id=${u.ID}`, { method: 'DELETE' }), '已取消限期'),
    remove: (u) => setDialog({ type: 'delete', user: u }),
  }

  return (
    <div>
      <PageHeader
        eyebrow={isAdmin ? 'Users' : 'Account'}
        title={isAdmin ? '用户' : '我的账号'}
        description={isAdmin ? '管理代理账号, 流量限额与使用期限' : '你的代理账号, 流量使用与客户端导入'}
        actions={
          isAdmin && (
            <>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCsv} />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload /> 导入
              </Button>
              <Button variant="outline" onClick={() => window.open('/trojan/export?token=' + encodeURIComponent(getToken()), '_blank')}>
                <Download /> 导出
              </Button>
              <Button onClick={() => setDialog({ type: 'add' })}>
                <Plus /> 新增用户
              </Button>
            </>
          )
        }
      />

      {!isAdmin ? (
        <AccountView user={users?.[0]} users={users} info={users?.[0] ? shareInfo(users[0]) : null} />
      ) : (
        <>
          <Stagger className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={UsersIcon} label="用户总数" tone="text-ink" loading={!users}>
              <Num value={stats.total} />
            </StatTile>
            <StatTile icon={Gauge} label="已停用 / 即将到期" tone="text-ink" loading={!users}>
              <Num value={stats.disabled} className={stats.disabled ? 'text-bad' : ''} />
              <span className="mx-1.5 text-muted">/</span>
              <Num value={stats.expiring} className={stats.expiring ? 'text-accent' : ''} />
            </StatTile>
            <StatTile icon={ArrowUp} label="累计上传" tone="text-accent" loading={!users}>
              <Bytes value={stats.up} />
            </StatTile>
            <StatTile icon={ArrowDown} label="累计下载" tone="text-cool" loading={!users}>
              <Bytes value={stats.down} />
            </StatTile>
          </Stagger>

          <Card spotlight={false} className="overflow-hidden">
            {/* 工具栏 */}
            <div className="flex flex-col gap-3 border-b border-rule p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索用户名…" className="pl-9 pr-8" />
                {query && (
                  <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-ink" aria-label="清空">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Segmented
                value={filter}
                onChange={setFilter}
                options={[
                  ['all', '全部'],
                  ['active', '正常'],
                  ['disabled', '已停用'],
                  ['limited', '有期限'],
                ]}
              />
            </div>

            {users === null ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState hasUsers={users.length > 0} onAdd={() => setDialog({ type: 'add' })} />
            ) : (
              <>
                {/* 桌面表格 */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-rule text-left text-[12px] text-muted">
                        <th className="px-4 py-2.5 font-medium">用户</th>
                        <th className="px-4 py-2.5 font-medium">密码</th>
                        <th className="px-4 py-2.5 font-medium">流量使用</th>
                        <th className="px-4 py-2.5 font-medium">到期</th>
                        <th className="w-24 px-4 py-2.5" />
                      </tr>
                    </thead>
                    <motion.tbody initial="hidden" animate="show" key={`${curPage}-${filter}`} variants={{ show: { transition: { staggerChildren: 0.035 } } }}>
                      <AnimatePresence>
                        {pageRows.map((u) => (
                          <UserRow key={u.ID} u={u} actions={actions} />
                        ))}
                      </AnimatePresence>
                    </motion.tbody>
                  </table>
                </div>

                {/* 移动端卡片 */}
                <div className="divide-y divide-rule md:hidden">
                  {pageRows.map((u) => (
                    <UserMobile key={u.ID} u={u} actions={actions} />
                  ))}
                </div>

                <Pagination page={curPage} count={pageCount} total={filtered.length} onChange={setPage} />
              </>
            )}
          </Card>
        </>
      )}

      {dialog?.type === 'add' && (
        <AddEditDialog
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(username, password) => run(() => call('/trojan/user', { method: 'POST', form: { username, password: btoa(password) } }), '新增用户成功')}
        />
      )}
      {dialog?.type === 'edit' && (
        <AddEditDialog
          busy={busy}
          user={dialog.user}
          onClose={() => setDialog(null)}
          onSubmit={(username, password) =>
            run(() => call('/trojan/user/update', { method: 'POST', form: { id: dialog.user.ID, username, password: btoa(password) } }), '修改成功')
          }
        />
      )}
      {dialog?.type === 'share' && <ShareDialog user={dialog.user} info={shareInfo(dialog.user)} onClose={() => setDialog(null)} />}
      {dialog?.type === 'quota' && (
        <QuotaDialog
          busy={busy}
          user={dialog.user}
          onClose={() => setDialog(null)}
          onSubmit={(quota) => run(() => call('/trojan/data', { method: 'POST', form: { id: dialog.user.ID, quota } }), '已设置限额')}
        />
      )}
      {dialog?.type === 'expire' && (
        <ExpireDialog
          busy={busy}
          user={dialog.user}
          onClose={() => setDialog(null)}
          onSubmit={(days) => run(() => call('/trojan/user/expire', { method: 'POST', form: { id: dialog.user.ID, useDays: days } }), '已设置限期')}
        />
      )}
      {dialog?.type === 'delete' && (
        <ConfirmDialog
          busy={busy}
          title={`删除用户 ${dialog.user.Username}`}
          description="删除后该用户将立即无法连接, 此操作不可恢复。"
          confirmText="确认删除"
          onClose={() => setDialog(null)}
          onConfirm={() => run(() => call(`/trojan/user?id=${dialog.user.ID}`, { method: 'DELETE' }), '已删除')}
        />
      )}
    </div>
  )
}

function StatTile({ icon: Icon, label, tone, loading, children }) {
  return (
    <StaggerItem>
      <Card className="p-4">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <Icon className={cn('h-3.5 w-3.5', tone)} />
          {label}
        </div>
        <div className="mt-1.5 flex items-baseline text-[26px] leading-tight text-ink">{loading ? <Skeleton className="mt-1 h-7 w-20" /> : children}</div>
      </Card>
    </StaggerItem>
  )
}

// 分段选择器: 选中块弹簧滑动
function Segmented({ value, onChange, options }) {
  const id = React.useId()
  return (
    <div className="inline-flex rounded-pill border border-rule bg-paper3 p-0.5">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn('relative rounded-[6px] px-3 py-1.5 text-[13px] transition-colors', value === v ? 'text-ink' : 'text-muted hover:text-ink2')}
        >
          {value === v && <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 rounded-[6px] border border-rule2 bg-paper2 shadow-sm" />}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  )
}

function PasswordCell({ pass }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center gap-1">
      <span className="measured w-[6.5rem] truncate text-[13px] text-ink2">{show ? pass : '••••••••'}</span>
      <Button variant="ghost" size="iconSm" className="h-7 w-7" onClick={() => setShow((v) => !v)} title={show ? '隐藏' : '显示'}>
        {show ? <EyeOff /> : <Eye />}
      </Button>
      <CopyButton text={pass} label="复制密码" className="h-7 w-7" />
    </div>
  )
}

function Usage({ u }) {
  const s = userState(u)
  return (
    <div className="min-w-[13rem]">
      <div className="measured flex items-center gap-3 text-[13px] text-ink2">
        <span className="inline-flex items-center gap-1">
          <ArrowUp className="h-3 w-3 text-accent" />
          {bytefmt(u.Upload)}
        </span>
        <span className="inline-flex items-center gap-1">
          <ArrowDown className="h-3 w-3 text-cool" />
          {bytefmt(u.Download)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        {s.disabled ? (
          <Badge variant="bad">已停用</Badge>
        ) : s.unlimited ? (
          <span className="text-[12px] text-muted">不限流量</span>
        ) : (
          <>
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-paper3">
              <motion.div
                className={cn('h-full rounded-full', s.ratio >= 0.9 ? 'bg-bad' : s.ratio >= 0.7 ? 'bg-accent' : 'bg-cool')}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(2, s.ratio * 100)}%` }}
                transition={{ duration: 0.8, ease: easeOut }}
              />
            </div>
            <span className="measured text-[12px] text-muted">{quotaText(u.Quota)}</span>
          </>
        )}
      </div>
    </div>
  )
}

function Expiry({ u }) {
  const s = userState(u)
  if (s.left === null) return <span className="text-[13px] text-muted">长期有效</span>
  return (
    <div>
      <div className="measured text-[13px] text-ink2">{u.ExpiryDate}</div>
      <div className={cn('mt-0.5 text-[12px]', s.left < 0 ? 'text-bad' : s.expiring ? 'text-accent' : 'text-muted')}>
        {s.left < 0 ? '已过期' : s.left === 0 ? '今天到期' : `剩余 ${s.left} 天`}
      </div>
    </div>
  )
}

function UserMenu({ u, actions }) {
  const s = userState(u)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="iconSm" aria-label="更多操作">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => actions.share(u)}>
          <QrCode /> 分享与订阅
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.edit(u)}>
          <Pencil /> 编辑
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.quota(u)}>
          <Gauge /> 限制流量
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.expire(u)}>
          <CalendarClock /> 设置限期
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.clean(u)}>
          <Eraser /> 清空流量
        </DropdownMenuItem>
        {s.left !== null && (
          <DropdownMenuItem onSelect={() => actions.cancelExpire(u)}>
            <X /> 取消限期
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-bad data-[highlighted]:bg-badSoft [&_svg]:!text-bad" onSelect={() => actions.remove(u)}>
          <Trash2 /> 删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserRow({ u, actions }) {
  return (
    <motion.tr
      layout="position"
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
      transition={{ duration: 0.35, ease: easeOut }}
      className="group border-b border-rule transition-colors last:border-0 hover:bg-paper3/60"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <UserAvatar name={u.Username} />
          <div className="leading-tight">
            <div className="font-medium">{u.Username}</div>
            <div className="measured mt-0.5 text-[11px] text-muted">#{u.ID}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <PasswordCell pass={decodePass(u.Password)} />
      </td>
      <td className="px-4 py-3">
        <Usage u={u} />
      </td>
      <td className="px-4 py-3">
        <Expiry u={u} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-0.5">
          <Button variant="ghost" size="iconSm" title="分享" className="opacity-60 transition-opacity group-hover:opacity-100" onClick={() => actions.share(u)}>
            <QrCode />
          </Button>
          <UserMenu u={u} actions={actions} />
        </div>
      </td>
    </motion.tr>
  )
}

function UserMobile({ u, actions }) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <UserAvatar name={u.Username} />
        <div className="flex-1 leading-tight">
          <div className="font-medium">{u.Username}</div>
          <div className="measured mt-0.5 text-[11px] text-muted">#{u.ID}</div>
        </div>
        <Button variant="ghost" size="iconSm" onClick={() => actions.share(u)} aria-label="分享">
          <QrCode />
        </Button>
        <UserMenu u={u} actions={actions} />
      </div>
      <Usage u={u} />
      <div className="flex items-center justify-between">
        <PasswordCell pass={decodePass(u.Password)} />
        <Expiry u={u} />
      </div>
    </div>
  )
}

function Pagination({ page, count, total, onChange }) {
  return (
    <div className="flex items-center justify-between border-t border-rule px-4 py-2.5">
      <span className="text-[12px] text-muted">
        共 <span className="measured text-ink2">{total}</span> 个 · 第 <span className="measured text-ink2">{page}</span> / {count} 页
      </span>
      <div className="flex gap-1">
        <Button variant="ghost" size="iconSm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="上一页">
          <ChevronLeft />
        </Button>
        <Button variant="ghost" size="iconSm" disabled={page >= count} onClick={() => onChange(page + 1)} aria-label="下一页">
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

function EmptyState({ hasUsers, onAdd }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring}
        className="grid h-14 w-14 place-items-center rounded-full border border-rule bg-paper3"
      >
        {hasUsers ? <Search className="h-6 w-6 text-muted" /> : <UserRound className="h-6 w-6 text-muted" />}
      </motion.div>
      <div className="mt-4 font-medium">{hasUsers ? '没有匹配的用户' : '还没有用户'}</div>
      <p className="mt-1 text-[13px] text-muted">{hasUsers ? '换个关键词或筛选条件试试' : '创建第一个账号, 即可生成分享链接与订阅'}</p>
      {!hasUsers && (
        <Button className="mt-5" onClick={onAdd}>
          <Plus /> 新增用户
        </Button>
      )}
    </div>
  )
}

// 普通用户: 账号信息直接铺开, 扫码即用
function AccountView({ user, users, info }) {
  if (users === null) return <Skeleton className="h-80 w-full rounded-card" />
  if (!user) return <Card className="p-10 text-center text-muted">未找到你的账号信息</Card>
  return (
    <Stagger className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <StaggerItem>
        <Card className="flex h-full flex-col items-center justify-center p-8">
          <QrPanel value={info.link} />
          <p className="mt-4 text-[13px] text-muted">使用客户端扫码导入</p>
        </Card>
      </StaggerItem>
      <StaggerItem>
        <Card className="h-full p-6">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.Username} />
            <div>
              <div className="text-lg font-medium">{user.Username}</div>
              <Expiry u={user} />
            </div>
          </div>
          <div className="mt-6">
            <Usage u={user} />
          </div>
          <div className="mt-6 space-y-4">
            <LinkField label="trojan 分享链接" value={info.link} />
            <LinkField label="clash 订阅地址" value={info.sub} />
          </div>
        </Card>
      </StaggerItem>
    </Stagger>
  )
}

function QrPanel({ value }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ ...spring, delay: 0.1 }}
      className="relative rounded-[16px] bg-white p-4 shadow-[0_20px_50px_-20px_var(--color-cool)]"
    >
      <QRCodeSVG value={value} size={184} bgColor="#ffffff" fgColor="#111318" level="M" />
      <span className="pointer-events-none absolute -inset-px rounded-[16px] ring-1 ring-cool/30" />
    </motion.div>
  )
}

function LinkField({ label, value }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly className="measured text-xs" value={value} onFocus={(e) => e.target.select()} />
        <CopyButton text={value} variant="outline" size="icon" />
      </div>
    </div>
  )
}

function AddEditDialog({ user, busy, onClose, onSubmit }) {
  const isEdit = !!user
  const [username, setUsername] = useState(user?.Username || '')
  const [password, setPassword] = useState(isEdit ? decodePass(user.Password) : '')
  const valid = username && password
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑用户' : '新增用户'}</DialogTitle>
          <DialogDescription>{isEdit ? '修改用户名或密码' : '用户名与密码均支持随机生成'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid && !busy) onSubmit(username, password)
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="u-name">用户名</Label>
            <div className="flex gap-2">
              <Input id="u-name" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
              <SpinButton title="随机生成" onClick={() => setUsername(randomStr(6).toLowerCase())} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-pass">密码</Label>
            <div className="flex gap-2">
              <Input id="u-pass" className="measured" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" />
              <SpinButton title="随机生成" onClick={() => setPassword(randomStr(16))} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={busy || !valid}>
              {isEdit ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 随机按钮: 每次点击旋转一圈
function SpinButton({ onClick, title }) {
  const [turns, setTurns] = useState(0)
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      title={title}
      onClick={() => {
        setTurns((t) => t + 1)
        onClick()
      }}
    >
      <motion.span animate={{ rotate: turns * 360 }} transition={spring} className="inline-flex">
        <RefreshCw />
      </motion.span>
    </Button>
  )
}

function ShareDialog({ user, info, onClose }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分享 · {user.Username}</DialogTitle>
          <DialogDescription>扫码或复制链接导入客户端</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          <QrPanel value={info.link} />
        </div>
        <div className="space-y-3">
          <LinkField label="trojan 分享链接" value={info.link} />
          <LinkField label="clash 订阅地址" value={info.sub} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

const QUOTA_PRESETS = [10, 50, 100, 500]

function QuotaDialog({ user, busy, onClose, onSubmit }) {
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('GB')
  const [unlimited, setUnlimited] = useState(Number(user.Quota) < 0)
  const valid = unlimited || (isFinite(Number(amount)) && Number(amount) > 0)
  function submit() {
    if (unlimited) return onSubmit(-1)
    if (!valid) return
    onSubmit(Math.round(Number(amount) * (unit === 'GB' ? 1024 ** 3 : 1024 ** 2)))
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>限制流量 · {user.Username}</DialogTitle>
          <DialogDescription>当前限额 {quotaText(user.Quota)}, 流量用尽后自动断连</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center justify-between rounded-pill border border-rule bg-paper3 px-3.5 py-3">
            <span className="text-sm">不限制流量</span>
            <Switch checked={unlimited} onCheckedChange={setUnlimited} />
          </label>
          <AnimatePresence initial={false}>
            {!unlimited && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-3 pt-1">
                  <div className="flex gap-2">
                    <Input type="number" min="0" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="流量大小" />
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GB">GB</SelectItem>
                        <SelectItem value="MB">MB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUOTA_PRESETS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setAmount(String(n))
                          setUnit('GB')
                        }}
                        className={cn(
                          'measured rounded-full border px-3 py-1 text-[12px] transition-colors',
                          amount === String(n) && unit === 'GB' ? 'border-accent/50 bg-accentSoft text-accent' : 'border-rule text-muted hover:border-rule2 hover:text-ink'
                        )}
                      >
                        {n} GB
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button disabled={busy || !valid} onClick={submit}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const DAY_PRESETS = [7, 30, 90, 180, 365]

function ExpireDialog({ user, busy, onClose, onSubmit }) {
  const [days, setDays] = useState('30')
  const n = Number(days)
  const valid = Number.isInteger(n) && n > 0
  const until = valid ? new Date(Date.now() + n * 86400000).toLocaleDateString('zh-CN') : '-'
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>设置限期 · {user.Username}</DialogTitle>
          <DialogDescription>到期后自动断连, 当前 {Number(user.UseDays) === 0 ? '长期有效' : `到期日 ${user.ExpiryDate}`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="days">使用天数</Label>
          <Input id="days" type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {DAY_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(String(d))}
                className={cn(
                  'measured rounded-full border px-3 py-1 text-[12px] transition-colors',
                  days === String(d) ? 'border-accent/50 bg-accentSoft text-accent' : 'border-rule text-muted hover:border-rule2 hover:text-ink'
                )}
              >
                {d} 天
              </button>
            ))}
          </div>
          <p className="text-[13px] text-muted">
            预计到期 <span className="measured text-ink2">{until}</span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button disabled={busy || !valid} onClick={() => onSubmit(n)}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDialog({ title, description, confirmText, busy, onClose, onConfirm }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <div className="flex gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-badSoft text-bad">
            <Trash2 className="h-5 w-5" />
          </span>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button variant="danger" disabled={busy} onClick={onConfirm}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
