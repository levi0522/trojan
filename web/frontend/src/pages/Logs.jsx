import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { RotateCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/layout'
import { getToken } from '@/lib/api'

// 实时日志: 最深一级表面 + 等宽字体, 仪器读数区
export default function Logs() {
  const [lines, setLines] = useState([])
  const [status, setStatus] = useState('connecting') // connecting | open | closed
  const [tail, setTail] = useState('300')
  const [autoScroll, setAutoScroll] = useState(true)
  const wsRef = useRef(null)
  const boxRef = useRef(null)

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
      setLines((prev) => {
        const next = prev.concat(String(e.data).replace(/\n$/, ''))
        return next.length > 2000 ? next.slice(next.length - 2000) : next
      })
    }
  }

  useEffect(() => {
    connect(tail)
    return () => wsRef.current?.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tail])

  useEffect(() => {
    if (autoScroll && boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight
    }
  }, [lines, autoScroll])

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <PageHeader
        title="日志"
        description="trojan 服务实时日志"
        actions={
          <>
            <Badge variant={status === 'open' ? 'ok' : status === 'connecting' ? 'cool' : 'bad'}>
              {status === 'open' ? '已连接' : status === 'connecting' ? '连接中' : '已断开'}
            </Badge>
            <Select value={tail} onValueChange={setTail}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="300">最近 300 行</SelectItem>
                <SelectItem value="500">最近 500 行</SelectItem>
                <SelectItem value="1000">最近 1000 行</SelectItem>
                <SelectItem value="-1">全部日志</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setAutoScroll((v) => !v)}>
              {autoScroll ? '暂停滚动' : '恢复滚动'}
            </Button>
            <Button variant="outline" size="icon" title="清屏" onClick={() => setLines([])}>
              <Trash2 />
            </Button>
            <Button variant="outline" size="icon" title="重新连接" onClick={() => connect(tail)}>
              <RotateCw />
            </Button>
          </>
        }
      />
      <div
        ref={boxRef}
        className="measured flex-1 overflow-auto rounded-card border border-rule bg-paper3 p-4 text-[13px] leading-relaxed text-ink2"
      >
        {lines.length === 0 ? (
          <div className="text-muted">{status === 'open' ? '等待日志输出…' : '正在连接日志流…'}</div>
        ) : (
          lines.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {l}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
