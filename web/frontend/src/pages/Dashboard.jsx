import * as React from 'react'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowDown, ArrowUp, Cpu, HardDrive, Layers, MemoryStick, Network, Play, RotateCw, Square, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/layout'
import { Bytes, Num, RingGauge, Sparkline, Stagger, StaggerItem, useSpotlight } from '@/components/fx'
import { call } from '@/lib/api'
import { bytefmt } from '@/lib/format'
import { cn } from '@/lib/utils'

const HISTORY = 45

export default function Dashboard({ isAdmin }) {
  const toast = useToast()
  const [info, setInfo] = useState(null)
  const [version, setVersion] = useState(null)
  const [acting, setActing] = useState('')
  const [history, setHistory] = useState(() => ({ up: Array(HISTORY).fill(0), down: Array(HISTORY).fill(0) }))

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
        if (stop) return
        setInfo(data)
        const s = data?.speed
        if (s) {
          setHistory((h) => ({
            up: [...h.up.slice(1), Number(s.Up) || 0],
            down: [...h.down.slice(1), Number(s.Down) || 0],
          }))
        }
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
      toast.success(action === 'start' ? 'trojan 已启动' : action === 'stop' ? 'trojan 已停止' : 'trojan 已重启')
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
  const load = info?.load

  return (
    <div>
      <PageHeader eyebrow="Dashboard" title="概览" description="服务器与 trojan 服务的实时状态, 每 2 秒刷新" />

      <Stagger className="grid gap-4 lg:grid-cols-3" step={0.07}>
        {/* 服务状态 */}
        <StaggerItem className="lg:col-span-3">
          <StatusHero
            running={running}
            version={version}
            isAdmin={isAdmin}
            acting={acting}
            onAction={trojanAction}
          />
        </StaggerItem>

        {/* 网络吞吐 */}
        <StaggerItem className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>
                  <Activity className="h-4 w-4 text-cool" />
                  网络吞吐
                </CardTitle>
                <p className="mt-1.5 text-[13px] text-muted">最近 {(HISTORY * 2) / 60} 分钟</p>
              </div>
              <div className="flex gap-4 text-[12px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cool" />
                  下行
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  上行
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <SpeedReading icon={ArrowDown} label="下行" value={speed?.Down} tone="text-cool" loading={!speed} />
                <SpeedReading icon={ArrowUp} label="上行" value={speed?.Up} tone="text-accent" loading={!speed} />
              </div>
              <Sparkline
                className="mt-5"
                height={140}
                series={[
                  { key: 'down', data: history.down, color: 'var(--color-cool)' },
                  { key: 'up', data: history.up, color: 'var(--color-accent)' },
                ]}
              />
            </CardContent>
          </Card>
        </StaggerItem>

        {/* 连接与负载 */}
        <StaggerItem>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>
                <Network className="h-4 w-4 text-cool" />
                连接与负载
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Tile label="TCP 连接" value={info?.netCount?.tcp} loading={!info} />
                <Tile label="UDP 连接" value={info?.netCount?.udp} loading={!info} />
              </div>
              <div>
                <div className="mb-2.5 text-[13px] text-muted">系统负载</div>
                {load ? (
                  <div className="space-y-2.5">
                    {[
                      ['1 分钟', load.load1],
                      ['5 分钟', load.load5],
                      ['15 分钟', load.load15],
                    ].map(([k, v]) => (
                      <LoadBar key={k} label={k} value={Number(v)} cores={info?.cpu?.length || 1} />
                    ))}
                  </div>
                ) : (
                  <Skeleton className="h-20 w-full" />
                )}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* 资源占用 */}
        <StaggerItem className="lg:col-span-3">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <GaugeCard icon={Cpu} title="CPU" value={info ? cpu : null} detail={info ? '整体使用率' : ''} />
            <GaugeCard icon={MemoryStick} title="内存" value={mem?.usedPercent} detail={mem ? `${bytefmt(mem.used)} / ${bytefmt(mem.total)}` : ''} />
            <GaugeCard icon={Layers} title="交换分区" value={swap?.usedPercent} detail={swap ? (Number(swap.total) ? `${bytefmt(swap.used)} / ${bytefmt(swap.total)}` : '未启用') : ''} />
            <GaugeCard icon={HardDrive} title="磁盘 /" value={disk?.usedPercent} detail={disk ? `${bytefmt(disk.used)} / ${bytefmt(disk.total)}` : ''} />
          </div>
        </StaggerItem>
      </Stagger>
    </div>
  )
}

function StatusHero({ running, version, isAdmin, acting, onAction }) {
  const track = useSpotlight()
  const tone = running === null ? 'muted' : running ? 'ok' : 'bad'
  return (
    <div
      onMouseMove={track}
      className="spotlight relative overflow-hidden rounded-card border border-rule bg-paper2 shadow-[var(--shadow-card)]"
    >
      {/* 背景状态光晕 */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full blur-[80px]"
        animate={{ opacity: running === null ? 0 : 0.28, backgroundColor: running ? 'var(--color-ok)' : 'var(--color-bad)' }}
        transition={{ duration: 0.8 }}
      />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(90deg,#000,transparent_60%)]" />

      <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-7">
        <div className="flex items-center gap-5">
          <StatusOrb tone={tone} />
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl md:text-2xl">trojan 服务</h2>
              {running === null ? (
                <Skeleton className="h-5 w-16 rounded-full" />
              ) : (
                <Badge variant={running ? 'ok' : 'bad'} dot pulse={running}>
                  {running ? '运行中' : '已停止'}
                </Badge>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
              {version ? (
                <>
                  <span>
                    核心 <span className="measured text-ink2">{version.trojanType || '-'}</span>
                    {version.trojanVersion && <span className="measured text-ink2"> {version.trojanVersion}</span>}
                  </span>
                  <span>
                    已运行 <span className="measured text-ink2">{version.trojanUptime || '—'}</span>
                  </span>
                </>
              ) : (
                <Skeleton className="h-4 w-48" />
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!!acting} onClick={() => onAction('start')}>
              <Play className="text-ok" /> 启动
            </Button>
            <Button variant="outline" disabled={!!acting} onClick={() => onAction('stop')}>
              <Square className="text-bad" /> 停止
            </Button>
            <Button disabled={!!acting} onClick={() => onAction('restart')}>
              <RotateCw className={cn(acting === 'restart' && 'animate-spin')} /> 重启
            </Button>
          </div>
        )}
      </div>

      <dl className="relative grid grid-cols-2 gap-px border-t border-rule bg-rule sm:grid-cols-4">
        {[
          ['管理程序', version?.version || 'dev'],
          ['构建时间', version?.buildDate],
          ['Go 版本', version?.goVersion],
          ['Git', version?.gitVersion],
        ].map(([k, v]) => (
          <div key={k} className="bg-paper2 px-6 py-3.5 md:px-7">
            <dt className="text-[12px] text-muted">{k}</dt>
            <dd className="measured mt-0.5 truncate text-[13px] text-ink2">{version ? v || '-' : <Skeleton className="mt-1 h-4 w-20" />}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// 状态光球: 运行时有向外扩散的波纹
function StatusOrb({ tone }) {
  const color = tone === 'ok' ? 'var(--color-ok)' : tone === 'bad' ? 'var(--color-bad)' : 'var(--color-muted)'
  return (
    <div className="relative grid h-14 w-14 shrink-0 place-items-center">
      {tone === 'ok' &&
        [0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: color }}
            initial={{ scale: 0.6, opacity: 0.6 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 1.2, ease: 'easeOut' }}
          />
        ))}
      <motion.span
        className="relative h-10 w-10 rounded-full"
        animate={{ backgroundColor: color, boxShadow: `0 0 28px 2px color-mix(in oklab, ${color} 55%, transparent)` }}
        transition={{ duration: 0.6 }}
        style={{ backgroundImage: 'radial-gradient(circle at 35% 30%, oklch(100% 0 0 / 0.45), transparent 60%)' }}
      />
    </div>
  )
}

function SpeedReading({ icon: Icon, label, value, tone, loading }) {
  return (
    <div className="rounded-[12px] border border-rule bg-paper3/60 p-4">
      <div className="flex items-center gap-1.5 text-[13px] text-muted">
        <Icon className={cn('h-3.5 w-3.5', tone)} />
        {label}
      </div>
      {loading ? <Skeleton className="mt-2 h-8 w-32" /> : <Bytes value={value} rate className={cn('mt-1 text-[28px] leading-tight md:text-[32px]', tone)} />}
    </div>
  )
}

function Tile({ label, value, loading }) {
  return (
    <div className="rounded-[12px] border border-rule bg-paper3/60 p-3.5">
      <div className="text-[12px] text-muted">{label}</div>
      {loading ? <Skeleton className="mt-2 h-7 w-12" /> : <Num value={value ?? 0} className="mt-1 text-2xl text-ink" />}
    </div>
  )
}

function LoadBar({ label, value, cores }) {
  const pct = Math.min(100, (value / Math.max(1, cores)) * 100)
  const color = pct >= 90 ? 'bg-bad' : pct >= 70 ? 'bg-accent' : 'bg-cool'
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-[12px] text-muted">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper3">
        <motion.div className={cn('h-full rounded-full', color)} initial={{ width: 0 }} animate={{ width: pct + '%' }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </div>
      <Num value={value} decimals={2} className="w-10 justify-end text-[13px] text-ink2" />
    </div>
  )
}

function GaugeCard({ icon: Icon, title, value, detail }) {
  return (
    <Card className="flex flex-col items-center p-5 text-center">
      <div className="mb-3 flex w-full items-center gap-2 text-[13px] font-medium text-ink2">
        <Icon className="h-4 w-4 text-muted" />
        {title}
      </div>
      {value === null || value === undefined ? (
        <Skeleton className="h-[112px] w-[112px] rounded-full" />
      ) : (
        <RingGauge value={value} />
      )}
      <div className="measured mt-3 min-h-[1.25rem] truncate text-[12px] text-muted">{detail}</div>
    </Card>
  )
}
