import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownToLine, Download, RotateCw, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/layout'
import { getToken } from '@/lib/api'
import { cn } from '@/lib/utils'

const MAX_LINES = 2000

// 按日志级别着色
function levelOf(line) {
  if (/\b(ERROR|FATAL|error|fatal)\b/.test(line)) return 'bad'
  if (/\b(WARN|WARNING|warn|warning)\b/.test(line)) return 'warn'
  if (/\b(INFO|info)\b/.test(line)) return 'info'
  return 'plain'
}

const LEVEL_CLASS = {
  bad: 'text-bad',
  warn: 'text-accent',
  info: 'text-ink2',
  plain: 'text-ink2',
}

function highlight(text, q) {
  if (!q) return text
  const i = text.toLowerCase().indexOf(q)
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-accent/30 text-ink">{text.slice(i, i + q.length)}</mark>
      {highlight(text.slice(i + q.length), q)}
    </>
  )
}

// 实时日志: 终端窗口样式, 等宽字体, 级别着色
export default function Logs() {
  const [lines, setLines] = useState([])
  const [status, setStatus] = useState('connecting') // connecting | open | closed
  const [tail, setTail] = useState('300')
  const [autoScroll, setAutoScroll] = useState(true)
  const [query, setQuery] = useState('')
  const [atBottom, setAtBottom] = useState(true)
  const wsRef = useRef(null)
  const boxRef = useRef(null)
  const seq = useRef(0)

  function connect(n) {
    wsRef.current?.close()
    setLines([])
    setStatus('connecting')
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/trojan/log?line=${n}&token=${encodeURIComponent(getToken())}`)
    wsRef.current = ws
    ws.onopen = () => setStatus('open')
    ws.onclose = () => setStatus('closed')
    ws.onerror = () => setStatus('closed')
    ws.onmessage = (e) => {
      const text = String(e.data).replace(/\n$/, '')
      setLines((prev) => {
        const next = prev.concat({ id: ++seq.current, text, level: levelOf(text) })
        return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next
      })
    }
  }

  useEffect(() => {
    connect(tail)
    return () => wsRef.current?.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tail])

  const q = query.trim().toLowerCase()
  const shown = useMemo(() => (q ? lines.filter((l) => l.text.toLowerCase().includes(q)) : lines), [lines, q])

  useEffect(() => {
    if (autoScroll && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [shown, autoScroll])

  function onScroll(e) {
    const el = e.currentTarget
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40)
  }

  function download() {
    const blob = new Blob([lines.map((l) => l.text).join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `trojan-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.log`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const statusBadge = {
    open: ['ok', '已连接'],
    connecting: ['cool', '连接中'],
    closed: ['bad', '已断开'],
  }[status]

  return (
    <div className="flex h-[calc(100dvh-12rem)] flex-col md:h-[calc(100dvh-4.5rem)]">
      <PageHeader
        eyebrow="Logs"
        title="日志"
        description="trojan 服务实时日志流"
        actions={
          <>
            <Select value={tail} onValueChange={setTail}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300">最近 300 行</SelectItem>
                <SelectItem value="500">最近 500 行</SelectItem>
                <SelectItem value="1000">最近 1000 行</SelectItem>
                <SelectItem value="-1">全部日志</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => connect(tail)}>
              <RotateCw className={cn(status === 'connecting' && 'animate-spin')} /> 重连
            </Button>
          </>
        }
      />

      {/* 终端窗口 */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-rule bg-paper3 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-rule bg-paper2/80 px-3 py-2 backdrop-blur">
          <div className="hidden gap-1.5 pl-1 sm:flex">
            <span className="h-3 w-3 rounded-full bg-[oklch(70%_0.17_25)]" />
            <span className="h-3 w-3 rounded-full bg-[oklch(82%_0.15_80)]" />
            <span className="h-3 w-3 rounded-full bg-[oklch(76%_0.15_150)]" />
          </div>
          <Badge variant={statusBadge[0]} dot pulse={status === 'open'}>
            {statusBadge[1]}
          </Badge>
          <span className="measured text-[12px] text-muted">
            {q ? `${shown.length} / ${lines.length}` : lines.length} 行
          </span>
          <div className="relative ml-auto w-full sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="过滤日志…" className="h-8 pl-8 pr-7 text-[13px]" />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label="清空">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-[12px] text-muted">
            <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
            自动滚动
          </label>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="iconSm" title="下载日志" onClick={download} disabled={!lines.length}>
              <Download />
            </Button>
            <Button variant="ghost" size="iconSm" title="清屏" onClick={() => setLines([])}>
              <Trash2 />
            </Button>
          </div>
        </div>

        <div ref={boxRef} onScroll={onScroll} className="scrollbar-thin measured flex-1 overflow-auto py-3 text-[12.5px] leading-[1.7]">
          {shown.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
              {status === 'connecting' ? (
                <>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-cool"
                        animate={{ opacity: [0.2, 1, 0.2], y: [0, -4, 0] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                  正在连接日志流…
                </>
              ) : q ? (
                '没有匹配的日志'
              ) : (
                <span>
                  等待日志输出<span className="animate-pulse">_</span>
                </span>
              )}
            </div>
          ) : (
            shown.map((l) => (
              <div
                key={l.id}
                className={cn(
                  'flex gap-3 whitespace-pre-wrap break-all px-4 hover:bg-paper2/60',
                  LEVEL_CLASS[l.level],
                  l.level === 'bad' && 'bg-bad/[0.06]'
                )}
                style={{ animation: 'line-in 280ms var(--ease-out)' }}
              >
                <span className="w-10 shrink-0 select-none text-right text-muted/50">{l.id}</span>
                <span className="min-w-0">{highlight(l.text, q)}</span>
              </div>
            ))
          )}
        </div>

        <AnimatePresence>
          {!atBottom && !autoScroll && shown.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-4 right-4">
              <Button
                size="sm"
                variant="cool"
                className="shadow-[var(--shadow-pop)]"
                onClick={() => boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' })}
              >
                <ArrowDownToLine /> 回到底部
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
