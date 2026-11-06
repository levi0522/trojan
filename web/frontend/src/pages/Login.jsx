import * as React from 'react'
import { useState } from 'react'
import { Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { request, setToken } from '@/lib/api'

// 登录 / 首次初始化(设置 admin 密码)
export default function Login({ mode, title, onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isSetup = mode === 'setup'

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (isSetup && password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setLoading(true)
    try {
      if (isSetup) {
        await request('/auth/register', { method: 'POST', form: { username: 'admin', password } })
        // 注册后直接登录
      }
      const data = await request('/auth/login', {
        method: 'POST',
        form: { username: isSetup ? 'admin' : username, password },
      })
      setToken(data.token)
      onLogin(isSetup ? 'admin' : username)
    } catch (err) {
      setError(err.message === 'incorrect username or password' ? '用户名或密码错误' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <Terminal className="h-5 w-5 text-accent" />
          <span className="text-lg font-medium tracking-tight">{title || 'trojan 管理平台'}</span>
        </div>
        <form onSubmit={submit} className="rounded-card border border-rule bg-paper2 p-6">
          <h1 className="text-xl">{isSetup ? '初始化管理员' : '登录'}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {isSetup ? '首次使用, 请设置 admin 管理员的登录密码' : '使用账号密码登录管理后台'}
          </p>
          <div className="mt-6 space-y-4">
            {isSetup ? (
              <div className="space-y-1.5">
                <Label>用户名</Label>
                <Input value="admin" disabled />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="username">用户名</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus={isSetup}
                required
              />
            </div>
            {isSetup && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm">确认密码</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
            )}
            {error && <p className="text-[13px] text-bad">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '请稍等…' : isSetup ? '设置密码并进入' : '登录'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
