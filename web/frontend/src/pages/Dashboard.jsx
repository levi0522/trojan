import * as React from 'react'
import { useEffect, useState } from 'react'
import { Play, Square, RotateCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/layout'
import { call } from '@/lib/api'
import { bytefmt, percent } from '@/lib/format'

function Meter({ label, value, detail }) {
  const v = Math.min(100, Math.max(0, Number(value) || 0))
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <span className="measured text-sm text-ink2">{percent(v)}</span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-paper3">
        <div className="h-1 rounded-full bg-cool" style={{ width: v + '%' }} />
      </div>
      {detail && <div className="mt-1 text-xs text-muted measured">{detail}</div>}
    </div>
  )
}

export default function Dashboard({ isAdmin }) {
  const toast = useToast()
  const [info, setInfo] = useState(null)
  const [version, setVersion] = useState(null)
  const [acting, setActing] = useState('')

  async function loadVersion() {
    try {
      setVersion(await call('/common/version'))
    } catch {
      /* 忽略 */
    }
  }

  useEffect(() => {
    loadVersion()
    let stop = false
    async function tick() {
      try {
        const data = await call('/common/serverInfo')
        if (!stop) setInfo(data)
      } catch {
        /* 忽略单次失败 */
      }
    }
    tick()
    const t = setInterval(tick, 2000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [])

  async function trojanAction(action) {
    setActing(action)
    try {
      await call('/trojan/' + action, { method: 'POST', form: {} })
      toast.success(action === 'start' ? '已启动' : action === 'stop' ? '已停止' : '已重启')
      setTimeout(loadVersion, 800)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setActing('')
    }
  }

  const running = version ? version.trojanUptime !== '' : null
  const cpu = info?.cpu?.[0] ?? 0
  const mem = info?.memory
  const swap = info?.swap
  const disk = info?.disk
  const speed = info?.speed

  return (
    <div>
      <PageHeader
        title="概览"
        description="服务器与 trojan 服务的实时状态"
        actions={
          isAdmin && (
            <>
              <Button variant="outline" size="sm" disabled={!!acting} onClick={() => trojanAction('start')}>
                <Play /> 启动
              </Button>
              <Button variant="outline" size="sm" disabled={!!acting} onClick={() => trojanAction('stop')}>
                <Square /> 停止
              </Button>
              <Button size="sm" disabled={!!acting} onClick={() => trojanAction('restart')}>
                <RotateCw /> 重启
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>trojan 服务</CardTitle>
            {running === null ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <Badge variant={running ? 'ok' : 'bad'}>{running ? '运行中' : '已停止'}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {version ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-[13px] text-muted">核心类型</dt>
                  <dd className="measured mt-0.5 text-ink2">{version.trojanType || '-'}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted">核心版本</dt>
                  <dd className="measured mt-0.5 text-ink2">{version.trojanVersion || '-'}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted">已运行</dt>
                  <dd className="measured mt-0.5 text-ink2">{version.trojanUptime || '-'}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted">管理程序</dt>
                  <dd className="measured mt-0.5 text-ink2">{version.version || 'dev'}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted">构建时间</dt>
                  <dd className="measured mt-0.5 text-ink2">{version.buildDate || '-'}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted">Go 版本</dt>
                  <dd className="measured mt-0.5 text-ink2">{version.goVersion || '-'}</dd>
                </div>
              </dl>
            ) : (
              <Skeleton className="h-20 w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>网络吞吐</CardTitle>
          </CardHeader>
          <CardContent>
            {speed ? (
              <div className="space-y-4">
                <div>
                  <div className="text-[13px] text-muted">下行</div>
                  <div className="measured mt-1 text-3xl text-cool">{bytefmt(speed.Down)}<span className="text-base text-muted">/s</span></div>
                </div>
                <div>
                  <div className="text-[13px] text-muted">上行</div>
                  <div className="measured mt-1 text-3xl text-cool">{bytefmt(speed.Up)}<span className="text-base text-muted">/s</span></div>
                </div>
                <div className="text-[13px] text-muted measured">
                  tcp {info?.netCount?.tcp ?? '-'} 条 · udp {info?.netCount?.udp ?? '-'} 条
                </div>
              </div>
            ) : (
              <Skeleton className="h-32 w-full" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>资源占用</CardTitle>
          </CardHeader>
          <CardContent>
            {info ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Meter label="cpu" value={cpu} detail={info?.load ? `load ${Number(info.load.load1).toFixed(2)} / ${Number(info.load.load5).toFixed(2)} / ${Number(info.load.load15).toFixed(2)}` : ''} />
                <Meter label="内存" value={mem?.usedPercent} detail={mem ? `${bytefmt(mem.used)} / ${bytefmt(mem.total)}` : ''} />
                <Meter label="交换分区" value={swap?.usedPercent} detail={swap ? `${bytefmt(swap.used)} / ${bytefmt(swap.total)}` : ''} />
                <Meter label="磁盘 /" value={disk?.usedPercent} detail={disk ? `${bytefmt(disk.used)} / ${bytefmt(disk.total)}` : ''} />
              </div>
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
