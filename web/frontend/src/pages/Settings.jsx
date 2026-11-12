import * as React from 'react'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Globe, Cpu, CalendarSync, Type, ListFilter, KeyRound, ArrowUpCircle, Repeat2, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/layout'
import { Stagger, StaggerItem, spring } from '@/components/fx'
import { call } from '@/lib/api'
import { cn } from '@/lib/utils'

const LOG_LEVELS = [
  { value: '0', label: '0 · all' },
  { value: '1', label: '1 · info' },
  { value: '2', label: '2 · warning' },
  { value: '3', label: '3 · error' },
  { value: '4', label: '4 · fatal' },
  { value: '5', label: '5 · none' },
]

const SECTIONS = [
  { id: 'domain', label: '域名', icon: Globe },
  { id: 'core', label: 'trojan 核心', icon: Cpu },
  { id: 'reset', label: '流量重置', icon: CalendarSync },
  { id: 'title', label: '登录页标题', icon: Type },
  { id: 'rules', label: 'clash 规则', icon: ListFilter },
  { id: 'password', label: '管理员密码', icon: KeyRound },
]

// 设置: 左侧锚点导航(滚动联动) + 右侧分区卡片
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
  const [active, setActive] = useState(SECTIONS[0].id)

  useEffect(() => {
    call('/common/version').then(setVersion).catch(() => {})
    call('/trojan/loglevel').then((d) => setLogLevel(String(d.loglevel))).catch(() => {})
    call('/trojan/data/resetDay').then((d) => setResetDay(String(d.resetDay))).catch(() => {})
    call('/common/clashRules').then((d) => setClashRules(typeof d === 'string' ? d : '')).catch(() => {})
  }, [])

  // 滚动联动: 视口上部的分区即为当前分区
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setActive(hit.target.id)
      },
      { rootMargin: '-10% 0px -60% 0px' }
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
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
      <PageHeader eyebrow="Settings" title="设置" description="域名, 核心, 流量与界面偏好" />

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav className="sticky top-8 hidden h-fit space-y-0.5 lg:block">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className={cn('relative flex items-center gap-2.5 rounded-pill px-3 py-2 text-[13px] transition-colors', active === s.id ? 'text-ink' : 'text-muted hover:text-ink2')}
            >
              {active === s.id && <motion.span layoutId="settings-active" transition={spring} className="absolute inset-0 rounded-pill bg-paper2 ring-1 ring-rule" />}
              <s.icon className={cn('relative h-4 w-4', active === s.id && 'text-accent')} />
              <span className="relative">{s.label}</span>
            </a>
          ))}
        </nav>

        <Stagger className="min-w-0 max-w-3xl space-y-4">
          <Section id="domain" icon={Globe} title="域名" desc="客户端配置与分享链接中使用的域名">
            <Row>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="例如 example.com" className="sm:max-w-sm" />
              <SaveButton busy={busy === 'domain'} disabled={!domain} onClick={() => save('domain', () => call('/trojan/domain', { method: 'POST', form: { domain } }), '域名已更新')} />
            </Row>
          </Section>

          <Section id="core" icon={Cpu} title="trojan 核心" desc="切换核心或更新到最新版本, 操作会自动重启服务">
            <div className="flex flex-col gap-4 rounded-[12px] border border-rule bg-paper3/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[12px] text-muted">当前核心</div>
                <div className="measured mt-0.5 text-lg text-cool">
                  {trojanType}
                  {version?.trojanVersion && <span className="ml-2 text-sm text-muted">{version.trojanVersion}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={!!busy}
                  onClick={() =>
                    save(
                      'switch',
                      async () => {
                        await call('/trojan/switch', { method: 'POST', form: { type: otherType } })
                        setVersion(await call('/common/version'))
                      },
                      `已切换为 ${otherType}`
                    )
                  }
                >
                  {busy === 'switch' ? <Loader2 className="animate-spin" /> : <Repeat2 />} 切换为 {otherType}
                </Button>
                <Button variant="outline" disabled={!!busy} onClick={() => save('update', () => call('/trojan/update', { method: 'POST', form: {} }), '更新完成')}>
                  {busy === 'update' ? <Loader2 className="animate-spin" /> : <ArrowUpCircle />} 更新核心
                </Button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <Label>日志等级</Label>
                <p className="mt-1 text-[12px] text-muted">数字越大输出越少, 修改后立即生效</p>
              </div>
              <Select
                value={logLevel}
                onValueChange={(v) => {
                  setLogLevel(v)
                  save('loglevel', () => call('/trojan/loglevel', { method: 'POST', form: { level: v } }), '日志等级已更新')
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择" />
                </SelectTrigger>
                <SelectContent>
                  {LOG_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>

          <Section id="reset" icon={CalendarSync} title="流量重置" desc="设置了限期的用户, 每月在这一天清零流量统计, 填 0 关闭">
            <Row>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">每月</span>
                <Input type="number" min="0" max="31" value={resetDay} onChange={(e) => setResetDay(e.target.value)} className="measured w-24 text-center" />
                <span className="text-sm text-muted">号</span>
              </div>
              <SaveButton
                busy={busy === 'resetDay'}
                disabled={resetDay === ''}
                onClick={() => save('resetDay', () => call('/trojan/data/resetDay', { method: 'POST', form: { day: resetDay } }), '重置日已更新')}
              />
            </Row>
          </Section>

          <Section id="title" icon={Type} title="登录页标题" desc="显示在登录页与浏览器标签页的名称">
            <Row>
              <Input value={loginTitle} onChange={(e) => setLoginTitle(e.target.value)} placeholder="trojan 管理平台" className="sm:max-w-sm" />
              <SaveButton
                busy={busy === 'title'}
                disabled={!loginTitle}
                onClick={() => save('title', () => call('/common/loginInfo', { method: 'POST', form: { title: loginTitle } }), '标题已更新')}
              />
            </Row>
          </Section>

          <Section id="rules" icon={ListFilter} title="clash 订阅规则" desc="拼接到订阅配置末尾的规则段, 修改后对用户订阅立即生效">
            <Textarea
              className="measured min-h-[240px] bg-paper3 text-[12.5px] leading-relaxed"
              value={clashRules}
              onChange={(e) => setClashRules(e.target.value)}
              spellCheck={false}
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="measured text-[12px] text-muted">{clashRules ? clashRules.split('\n').length : 0} 行</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  disabled={busy === 'rules'}
                  onClick={() =>
                    save(
                      'rules',
                      async () => {
                        const d = await call('/common/clashRules', { method: 'DELETE' })
                        setClashRules(typeof d === 'string' ? d : '')
                      },
                      '已恢复默认规则'
                    )
                  }
                >
                  恢复默认
                </Button>
                <SaveButton
                  primary
                  label="保存规则"
                  busy={busy === 'rules'}
                  onClick={() => save('rules', () => call('/common/clashRules', { method: 'POST', form: { rules: clashRules } }), '规则已保存')}
                />
              </div>
            </div>
          </Section>

          <Section id="password" icon={KeyRound} title="管理员密码" desc="修改 admin 的登录密码, 下次登录生效">
            <Row>
              <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="新密码" autoComplete="new-password" className="sm:max-w-sm" />
              <SaveButton
                label="修改"
                busy={busy === 'pass'}
                disabled={!newPass}
                onClick={() =>
                  save(
                    'pass',
                    async () => {
                      await call('/auth/reset_pass', { method: 'POST', form: { username: 'admin', password: newPass } })
                      setNewPass('')
                    },
                    '密码已修改'
                  )
                }
              />
            </Row>
          </Section>

          {version && (
            <StaggerItem as="p" className="measured px-1 pt-2 text-xs text-muted">
              管理程序 {version.version || 'dev'} · 构建 {version.buildDate || '-'} · {version.gitVersion || '-'}
            </StaggerItem>
          )}
        </Stagger>
      </div>
    </div>
  )
}

function Section({ id, icon: Icon, title, desc, children }) {
  return (
    <StaggerItem>
      <Card id={id} className="scroll-mt-8 p-5 md:p-6">
        <div className="mb-5 flex items-start gap-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill border border-rule2 bg-paper3 text-accent">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="text-[15px] font-medium leading-tight">{title}</h3>
            <p className="mt-1 text-[13px] text-muted">{desc}</p>
          </div>
        </div>
        {children}
      </Card>
    </StaggerItem>
  )
}

function Row({ children }) {
  return <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{children}</div>
}

function SaveButton({ busy, disabled, onClick, label = '保存', primary }) {
  return (
    <Button variant={primary ? 'primary' : 'outline'} disabled={busy || disabled} onClick={onClick} className="min-w-[5rem]">
      {busy ? <Loader2 className="animate-spin" /> : label}
    </Button>
  )
}
