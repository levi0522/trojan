import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, MoreHorizontal, Copy, Download, Upload, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/layout'
import { call, getToken } from '@/lib/api'
import { bytefmt, decodePass, quotaText } from '@/lib/format'

function randomStr(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let s = ''
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

async function copyText(text, toast) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('已复制')
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    toast.success('已复制')
  }
}

export default function Users({ isAdmin }) {
  const toast = useToast()
  const [users, setUsers] = useState(null)
  const [domain, setDomain] = useState('')
  const [port, setPort] = useState(0)
  const [page, setPage] = useState({ CurPage: 1, PageNum: 1, Total: 0, PageSize: 10 })
  const [dialog, setDialog] = useState(null) // {type: 'add'|'edit'|'share'|'quota'|'expire'|'delete'|'clean', user?}
  const [busy, setBusy] = useState(false)
  const fileRef = React.useRef(null)

  const load = useCallback(
    async (curPage = page.CurPage) => {
      try {
        if (isAdmin) {
          const data = await call(`/trojan/user/page?curPage=${curPage}&pageSize=${page.PageSize}`)
          setUsers(data.pageData.DataList || [])
          setPage(data.pageData)
          setDomain(data.domain)
          setPort(data.port)
        } else {
          const data = await call('/trojan/user')
          setUsers(data.userList || [])
          setDomain(data.domain)
          setPort(data.port)
        }
      } catch (e) {
        toast.error(e.message)
      }
    },
    [isAdmin, page.CurPage, page.PageSize]
  )

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function shareInfo(user) {
    const pass = decodePass(user.Password)
    const remark = encodeURIComponent(`${domain}:${port}`)
    const link = `trojan://${pass}@${domain}:${port}#${remark}`
    const subToken = btoa(unescape(encodeURIComponent(JSON.stringify({ user: user.Username, pass }))))
    const sub = `${location.origin}/trojan/user/subscribe?token=${subToken}`
    return { pass, link, sub }
  }

  async function run(fn, okMsg, refresh = true) {
    setBusy(true)
    try {
      await fn()
      if (okMsg) toast.success(okMsg)
      setDialog(null)
      if (refresh) load()
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
      load(1)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const totalUsage = useMemo(
    () => (users || []).reduce((acc, u) => ({ up: acc.up + Number(u.Upload), down: acc.down + Number(u.Download) }), { up: 0, down: 0 }),
    [users]
  )

  return (
    <div>
      <PageHeader
        title={isAdmin ? '用户' : '我的账号'}
        description={
          isAdmin
            ? `共 ${page.Total} 个用户 · 累计上传 ${bytefmt(totalUsage.up)} · 累计下载 ${bytefmt(totalUsage.down)}`
            : '你的代理账号信息'
        }
        actions={
          isAdmin && (
            <>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCsv} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload /> 导入
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/trojan/export?token=' + encodeURIComponent(getToken()), '_blank')}
              >
                <Download /> 导出
              </Button>
              <Button size="sm" onClick={() => setDialog({ type: 'add' })}>
                <Plus /> 新增用户
              </Button>
            </>
          )
        }
      />

      <div className="rounded-card border border-rule bg-paper2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户名</TableHead>
              <TableHead>密码</TableHead>
              <TableHead>上传 / 下载</TableHead>
              <TableHead>限额</TableHead>
              <TableHead>限期</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users === null ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted">
                  暂无用户
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const expired = Number(u.Quota) === 0
                return (
                  <TableRow key={u.ID}>
                    <TableCell className="font-medium">{u.Username}</TableCell>
                    <TableCell>
                      <span className="measured text-[13px] text-ink2">{decodePass(u.Password)}</span>
                      <button
                        className="ml-1.5 inline-flex align-middle text-muted transition-colors hover:text-ink"
                        onClick={() => copyText(decodePass(u.Password), toast)}
                        title="复制密码"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                    <TableCell className="measured text-[13px] text-ink2">
                      {bytefmt(u.Upload)} / {bytefmt(u.Download)}
                    </TableCell>
                    <TableCell>
                      {expired ? <Badge variant="bad">已用尽</Badge> : <span className="measured text-[13px] text-ink2">{quotaText(u.Quota)}</span>}
                    </TableCell>
                    <TableCell className="measured text-[13px] text-ink2">
                      {Number(u.UseDays) === 0 ? '无限制' : u.ExpiryDate}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setDialog({ type: 'share', user: u })}>分享与订阅</DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuItem onSelect={() => setDialog({ type: 'edit', user: u })}>编辑</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setDialog({ type: 'quota', user: u })}>限制流量</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setDialog({ type: 'expire', user: u })}>设置限期</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => run(() => call(`/trojan/data?id=${u.ID}`, { method: 'DELETE' }), '已清空流量')}>
                                清空流量
                              </DropdownMenuItem>
                              {Number(u.UseDays) !== 0 && (
                                <DropdownMenuItem
                                  onSelect={() => run(() => call(`/trojan/user/expire?id=${u.ID}`, { method: 'DELETE' }), '已取消限期')}
                                >
                                  取消限期
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-bad data-[highlighted]:bg-badSoft" onSelect={() => setDialog({ type: 'delete', user: u })}>
                                删除
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        {isAdmin && page.PageNum > 1 && (
          <div className="flex items-center justify-between border-t border-rule px-4 py-2.5">
            <span className="text-[13px] text-muted measured">
              第 {page.CurPage} / {page.PageNum} 页
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" disabled={page.CurPage <= 1} onClick={() => load(page.CurPage - 1)}>
                <ChevronLeft />
              </Button>
              <Button variant="ghost" size="icon" disabled={page.CurPage >= page.PageNum} onClick={() => load(page.CurPage + 1)}>
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>

      {dialog?.type === 'add' && <AddEditDialog busy={busy} onClose={() => setDialog(null)} onSubmit={(username, password) =>
        run(() => call('/trojan/user', { method: 'POST', form: { username, password: btoa(password) } }), '新增用户成功')
      } />}
      {dialog?.type === 'edit' && <AddEditDialog busy={busy} user={dialog.user} onClose={() => setDialog(null)} onSubmit={(username, password) =>
        run(() => call('/trojan/user/update', { method: 'POST', form: { id: dialog.user.ID, username, password: btoa(password) } }), '修改成功')
      } />}
      {dialog?.type === 'share' && <ShareDialog user={dialog.user} info={shareInfo(dialog.user)} onClose={() => setDialog(null)} toast={toast} />}
      {dialog?.type === 'quota' && <QuotaDialog busy={busy} user={dialog.user} onClose={() => setDialog(null)} onSubmit={(quota) =>
        run(() => call('/trojan/data', { method: 'POST', form: { id: dialog.user.ID, quota } }), '已设置限额')
      } />}
      {dialog?.type === 'expire' && <ExpireDialog busy={busy} user={dialog.user} onClose={() => setDialog(null)} onSubmit={(days) =>
        run(() => call('/trojan/user/expire', { method: 'POST', form: { id: dialog.user.ID, useDays: days } }), '已设置限期')
      } />}
      {dialog?.type === 'delete' && (
        <ConfirmDialog
          busy={busy}
          title={`删除用户 ${dialog.user.Username}`}
          description="删除后该用户将立即无法连接, 此操作不可恢复。"
          confirmText="删除"
          onClose={() => setDialog(null)}
          onConfirm={() => run(() => call(`/trojan/user?id=${dialog.user.ID}`, { method: 'DELETE' }), '已删除')}
        />
      )}
    </div>
  )
}

function AddEditDialog({ user, busy, onClose, onSubmit }) {
  const isEdit = !!user
  const [username, setUsername] = useState(user?.Username || '')
  const [password, setPassword] = useState(isEdit ? decodePass(user.Password) : '')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑用户' : '新增用户'}</DialogTitle>
          <DialogDescription>{isEdit ? '修改用户名或密码' : '用户名与密码均支持随机生成'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>用户名</Label>
            <div className="flex gap-2">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
              <Button type="button" variant="outline" size="icon" title="随机生成" onClick={() => setUsername(randomStr(4).toLowerCase())}>
                <RefreshCw />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>密码</Label>
            <div className="flex gap-2">
              <Input className="measured" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" />
              <Button type="button" variant="outline" size="icon" title="随机生成" onClick={() => setPassword(randomStr(10))}>
                <RefreshCw />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button disabled={busy || !username || !password} onClick={() => onSubmit(username, password)}>
            {isEdit ? '保存' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ShareDialog({ user, info, onClose, toast }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分享 · {user.Username}</DialogTitle>
          <DialogDescription>扫码或复制链接导入客户端</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center rounded-card border border-rule bg-paper p-6">
          <QRCodeSVG value={info.link} size={176} bgColor="transparent" fgColor="currentColor" className="text-ink" />
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>trojan 分享链接</Label>
            <div className="flex gap-2">
              <Input readOnly className="measured text-xs" value={info.link} onFocus={(e) => e.target.select()} />
              <Button variant="outline" size="icon" onClick={() => copyText(info.link, toast)}><Copy /></Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>clash 订阅地址</Label>
            <div className="flex gap-2">
              <Input readOnly className="measured text-xs" value={info.sub} onFocus={(e) => e.target.select()} />
              <Button variant="outline" size="icon" onClick={() => copyText(info.sub, toast)}><Copy /></Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function QuotaDialog({ user, busy, onClose, onSubmit }) {
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('GB')
  const [unlimited, setUnlimited] = useState(Number(user.Quota) < 0)
  function submit() {
    if (unlimited) return onSubmit(-1)
    const n = Number(amount)
    if (!isFinite(n) || n <= 0) return
    onSubmit(Math.round(n * (unit === 'GB' ? 1024 ** 3 : 1024 ** 2)))
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>限制流量 · {user.Username}</DialogTitle>
          <DialogDescription>当前限额 {quotaText(user.Quota)}, 流量用尽后自动断连</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} className="accent-[var(--color-accent)]" />
            无限制
          </label>
          {!unlimited && (
            <div className="flex gap-2">
              <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="流量大小" />
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GB">GB</SelectItem>
                  <SelectItem value="MB">MB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button disabled={busy || (!unlimited && !amount)} onClick={submit}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExpireDialog({ user, busy, onClose, onSubmit }) {
  const [days, setDays] = useState('30')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>设置限期 · {user.Username}</DialogTitle>
          <DialogDescription>到期后自动断连, 当前 {Number(user.UseDays) === 0 ? '无限制' : `到期日 ${user.ExpiryDate}`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>使用天数</Label>
          <Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button disabled={busy || !Number(days) || Number(days) <= 0} onClick={() => onSubmit(Number(days))}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDialog({ title, description, confirmText, busy, onClose, onConfirm }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="danger" disabled={busy} onClick={onConfirm}>{confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
