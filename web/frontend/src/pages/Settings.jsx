import * as React from 'react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/layout'
import { call } from '@/lib/api'

const LOG_LEVELS = [
  { value: '0', label: '0 · all' },
  { value: '1', label: '1 · info' },
  { value: '2', label: '2 · warning' },
  { value: '3', label: '3 · error' },
  { value: '4', label: '4 · fatal' },
  { value: '5', label: '5 · none' },
]

// 设置: 每个区块一张发线面板, 保存动作就地完成
export default function Settings() {
  const toast = useToast()
  const [version, setVersion] = useState(null)
  const [domain, setDomain] = useState('')
  const [logLevel, setLogLevel] = useState('')
  const [resetDay, setResetDay] = useState('')
  const [loginTitle, setLoginTitle] = useState('')
  const [clashRules, setClashRules] = useState('')
  const [newPass, setNewPass] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    call('/common/version').then(setVersion).catch(() => {})
    call('/trojan/loglevel').then((d) => setLogLevel(String(d.loglevel))).catch(() => {})
    call('/trojan/data/resetDay').then((d) => setResetDay(String(d.resetDay))).catch(() => {})
    call('/common/clashRules').then((d) => setClashRules(typeof d === 'string' ? d : '')).catch(() => {})
  }, [])

  async function save(key, fn, okMsg) {
    setBusy(key)
    try {
      await fn()
      toast.success(okMsg || '已保存')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy('')
    }
  }

  const trojanType = version?.trojanType || 'trojan'
  const otherType = trojanType === 'trojan' ? 'trojan-go' : 'trojan'

  return (
    <div>
      <PageHeader title="设置" description="域名, 核心, 流量与界面偏好" />

      <div className="grid max-w-4xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>域名</CardTitle>
            <CardDescription>客户端配置与分享链接中使用的域名</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="例如 example.com" className="max-w-xs" />
            <Button
              variant="outline"
              disabled={busy === 'domain' || !domain}
              onClick={() => save('domain', () => call('/trojan/domain', { method: 'POST', form: { domain } }), '域名已更新')}
            >
              保存
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>trojan 核心</CardTitle>
            <CardDescription>切换核心或更新到最新版本, 操作会自动重启服务</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <div className="text-sm">
              当前核心 <span className="measured text-cool">{trojanType}</span>
              {version?.trojanVersion && <span className="measured text-muted"> · {version.trojanVersion}</span>}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!!busy}
                onClick={() =>
                  save('switch', async () => {
                    await call('/trojan/switch', { method: 'POST', form: { type: otherType } })
                    setVersion(await call('/common/version'))
                  }, `已切换为 ${otherType}`)
                }
              >
                切换为 {otherType}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!!busy}
                onClick={() => save('update', () => call('/trojan/update', { method: 'POST', form: {} }), '更新完成')}
              >
                更新核心
              </Button>
              <div className="flex items-center gap-2">
                <Label>日志等级</Label>
                <Select value={logLevel} onValueChange={(v) => { setLogLevel(v); save('loglevel', () => call('/trojan/loglevel', { method: 'POST', form: { level: v } }), '日志等级已更新') }}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="选择" /></SelectTrigger>
                  <SelectContent>
                    {LOG_LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>流量重置</CardTitle>
            <CardDescription>设置了限期的用户, 每月在这一天清零流量统计, 填 0 关闭</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <span className="text-sm text-muted">每月</span>
            <Input type="number" min="0" max="31" value={resetDay} onChange={(e) => setResetDay(e.target.value)} className="w-24" />
            <span className="text-sm text-muted">号</span>
            <Button
              variant="outline"
              disabled={busy === 'resetDay' || resetDay === ''}
              onClick={() => save('resetDay', () => call('/trojan/data/resetDay', { method: 'POST', form: { day: resetDay } }), '重置日已更新')}
            >
              保存
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>登录页标题</CardTitle>
            <CardDescription>显示在登录页与浏览器标签页的名称</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input value={loginTitle} onChange={(e) => setLoginTitle(e.target.value)} placeholder="trojan 管理平台" className="max-w-xs" />
            <Button
              variant="outline"
              disabled={busy === 'title' || !loginTitle}
              onClick={() => save('title', () => call('/common/loginInfo', { method: 'POST', form: { title: loginTitle } }), '标题已更新')}
            >
              保存
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>clash 订阅规则</CardTitle>
            <CardDescription>拼接到订阅配置末尾的规则段, 修改后对用户订阅立即生效</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea className="measured min-h-[200px] text-[13px]" value={clashRules} onChange={(e) => setClashRules(e.target.value)} spellCheck={false} />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={busy === 'rules'}
                onClick={() => save('rules', () => call('/common/clashRules', { method: 'POST', form: { rules: clashRules } }), '规则已保存')}
              >
                保存规则
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy === 'rules'}
                onClick={() =>
                  save('rules', async () => {
                    const d = await call('/common/clashRules', { method: 'DELETE' })
                    setClashRules(typeof d === 'string' ? d : '')
                  }, '已恢复默认规则')
                }
              >
                恢复默认
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>管理员密码</CardTitle>
            <CardDescription>修改 admin 的登录密码, 下次登录生效</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="新密码" className="max-w-xs" />
            <Button
              variant="outline"
              disabled={busy === 'pass' || !newPass}
              onClick={() =>
                save('pass', async () => {
                  await call('/auth/reset_pass', { method: 'POST', form: { username: 'admin', password: newPass } })
                  setNewPass('')
                }, '密码已修改')
              }
            >
              修改
            </Button>
          </CardContent>
        </Card>

        {version && (
          <p className="measured text-xs text-muted">
            管理程序 {version.version || 'dev'} · 构建 {version.buildDate || '-'} · {version.gitVersion || '-'}
          </p>
        )}
      </div>
    </div>
  )
}
