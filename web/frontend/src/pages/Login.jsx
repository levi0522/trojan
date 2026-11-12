import * as React from 'react'
import { useState } from 'react'
import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { ArrowRight, Eye, EyeOff, Gauge, Loader2, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo, Stagger, StaggerItem, easeOut } from '@/components/fx'
import { request, setToken } from '@/lib/api'

const FEATURES = [
  { icon: Users, title: '多用户管理', desc: '限额, 限期, 一键分享与订阅' },
  { icon: Gauge, title: '实时监控', desc: '吞吐, 连接数与资源占用' },
  { icon: ShieldCheck, title: '服务控制', desc: '启停, 切换核心, 实时日志' },
]

// 登录 / 首次初始化(设置 admin 密码)
export default function Login({ mode, title, onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [formRef, animate] = useAnimate()
  const [loading, setLoading] = useState(false)
  const isSetup = mode === 'setup'

  function fail(msg) {
    setError(msg)
    animate(formRef.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.42 })
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (isSetup && password !== confirm) return fail('两次输入的密码不一致')
    setLoading(true)
    try {
      if (isSetup) {
        await request('/auth/register', { method: 'POST', form: { username: 'admin', password } })
      }
      const data = await request('/auth/login', {
        method: 'POST',
        form: { username: isSetup ? 'admin' : username, password },
      })
      setToken(data.token)
      onLogin(isSetup ? 'admin' : username)
    } catch (err) {
      fail(err.message === 'incorrect username or password' ? '用户名或密码错误' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* 左: 品牌区 */}
      <section className="relative hidden overflow-hidden border-r border-rule bg-paper3 lg:block">
        <Aurora />
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_30%_40%,#000_10%,transparent_70%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="flex items-center gap-3"
          >
            <Logo className="h-9 w-9" />
            <span className="text-lg font-medium tracking-tight">{title || 'trojan 管理平台'}</span>
          </motion.div>

          <Stagger delay={0.15} step={0.09} className="max-w-lg">
            <StaggerItem as="h2" className="text-[44px] leading-[1.08] xl:text-[52px]">
              稳定, 安全,
              <br />
              <span className="text-gradient">一切尽在掌控</span>
            </StaggerItem>
            <StaggerItem as="p" className="mt-5 text-[15px] leading-relaxed text-muted">
              为 trojan 打造的多用户管理控制台。实时掌握服务器状态, 轻松管理每一位用户的流量与期限。
            </StaggerItem>
            <div className="mt-10 grid gap-3">
              {FEATURES.map((f) => (
                <StaggerItem
                  key={f.title}
                  className="flex items-center gap-4 rounded-card border border-rule bg-paper2/50 p-4 backdrop-blur-sm"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-pill border border-rule2 bg-paper3 text-accent">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-medium">{f.title}</div>
                    <div className="text-[13px] text-muted">{f.desc}</div>
                  </div>
                </StaggerItem>
              ))}
            </div>
          </Stagger>

          <div className="measured text-xs text-muted">© trojan · secure tunnel console</div>
        </div>
      </section>

      {/* 右: 表单 */}
      <section className="relative flex items-center justify-center px-5 py-12">
        <div className="absolute inset-0 overflow-hidden lg:hidden">
          <Aurora />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
          className="relative w-full max-w-[380px]"
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo className="h-8 w-8" />
            <span className="text-lg font-medium tracking-tight">{title || 'trojan 管理平台'}</span>
          </div>

          <h1 className="text-[30px] leading-tight">{isSetup ? '初始化管理员' : '欢迎回来'}</h1>
          <p className="mt-2 text-sm text-muted">{isSetup ? '首次使用, 请为 admin 设置登录密码' : '登录以继续管理你的 trojan 服务'}</p>

          <form ref={formRef} onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              {isSetup ? (
                <Input id="username" value="admin" disabled className="h-11" />
              ) : (
                <Input
                  id="username"
                  className="h-11"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  className="h-11 pr-11"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSetup ? 'new-password' : 'current-password'}
                  autoFocus={isSetup}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-pill text-muted transition-colors hover:bg-paper2 hover:text-ink"
                  aria-label={show ? '隐藏密码' : '显示密码'}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {isSetup && (
              <div className="space-y-2">
                <Label htmlFor="confirm">确认密码</Label>
                <Input id="confirm" className="h-11" type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
            )}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-pill border border-bad/30 bg-badSoft px-3 py-2 text-[13px] text-bad"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <Button type="submit" size="lg" className="group w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" /> 请稍等…
                </>
              ) : (
                <>
                  {isSetup ? '设置密码并进入' : '登录'}
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </section>
    </div>
  )
}

// 极光背景: 三团模糊色块缓慢漂移
function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute -left-[10%] top-[10%] h-[55%] w-[60%] rounded-full opacity-50 blur-[90px]"
        style={{ background: 'var(--color-cool)', animation: 'aurora 18s ease-in-out infinite' }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] h-[50%] w-[55%] rounded-full opacity-40 blur-[100px]"
        style={{ background: 'var(--color-accent)', animation: 'aurora 22s ease-in-out infinite reverse' }}
      />
      <div
        className="absolute left-[35%] top-[45%] h-[30%] w-[35%] rounded-full opacity-25 blur-[80px]"
        style={{ background: 'var(--color-accent-2)', animation: 'aurora 26s ease-in-out infinite' }}
      />
    </div>
  )
}
