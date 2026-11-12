import * as React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import NumberFlow from '@number-flow/react'
import { cn } from '@/lib/utils'

// 统一的弹簧与缓动, 全站动效共用, 保证节奏一致
export const spring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }
export const softSpring = { type: 'spring', stiffness: 160, damping: 24 }
export const easeOut = [0.22, 1, 0.36, 1]

// 依次入场: 容器 + 子项
export function Stagger({ children, className, delay = 0, step = 0.06, as = 'div', ...props }) {
  const Comp = motion[as]
  return (
    <Comp
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: step, delayChildren: delay } } }}
      {...props}
    >
      {children}
    </Comp>
  )
}

export const itemVariants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: easeOut } },
}

export function StaggerItem({ children, className, as = 'div', ...props }) {
  const Comp = motion[as]
  return (
    <Comp className={className} variants={itemVariants} {...props}>
      {children}
    </Comp>
  )
}

// 页面切换: 轻微上浮 + 模糊消散
export function PageTransition({ children }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={reduce ? undefined : { opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.15 } }}
      transition={{ duration: 0.4, ease: easeOut }}
    >
      {children}
    </motion.div>
  )
}

// 鼠标跟随聚光: 写 CSS 变量, 不触发 React 重渲染
export function useSpotlight() {
  return React.useCallback((e) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }, [])
}

// 数字滚动: 单位不参与动画, 只滚数字
export function Num({ value, decimals = 0, suffix, className, ...props }) {
  const n = Number(value)
  return (
    <span className={cn('measured inline-flex items-baseline', className)}>
      <NumberFlow
        value={isFinite(n) ? n : 0}
        format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: false }}
        willChange
        {...props}
      />
      {suffix && <span className="ml-1 text-[0.55em] font-normal text-muted">{suffix}</span>}
    </span>
  )
}

// 字节数拆成 {value, unit}, 供数字动画使用
export function splitBytes(bytes) {
  let v = Math.max(0, Number(bytes) || 0)
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return { value: v, unit: units[i], decimals: i === 0 ? 0 : v >= 100 ? 1 : 2 }
}

export function Bytes({ value, rate, className }) {
  const { value: v, unit, decimals } = splitBytes(value)
  return <Num value={v} decimals={decimals} suffix={unit + (rate ? '/s' : '')} className={className} />
}

// 环形仪表: 弧线带弹簧动画, 颜色随占用升高变暖
export function RingGauge({ value, size = 112, stroke = 9, label, children }) {
  const v = Math.min(100, Math.max(0, Number(value) || 0))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const tone = v >= 90 ? 'var(--color-bad)' : v >= 70 ? 'var(--color-accent)' : 'var(--color-cool)'
  const id = React.useId()
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity="0.55" />
            <stop offset="100%" stopColor={tone} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-paper-3)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v / 100) }}
          transition={softSpring}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Num value={v} decimals={1} suffix="%" className="text-xl text-ink" />
        {label && <span className="mt-0.5 text-[12px] text-muted">{label}</span>}
      </div>
      {children}
    </div>
  )
}

// 实时折线面积图: 纯 SVG, 两条序列(下行/上行)
export function Sparkline({ series, height = 120, className }) {
  const w = 600
  const max = Math.max(1, ...series.flatMap((s) => s.data))
  const n = Math.max(2, ...series.map((s) => s.data.length))
  const path = (data) => {
    const pts = data.map((v, i) => [(i / (n - 1)) * w, height - 6 - (v / max) * (height - 16)])
    if (pts.length < 2) return ''
    // 平滑曲线: 简单 catmull-rom 转贝塞尔
    let d = `M ${pts[0][0]} ${pts[0][1]}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[i + 2] || p2
      // 控制点 y 夹在相邻两点之间, 避免突变处曲线越过基线
      const clamp = (y) => Math.min(Math.max(y, Math.min(p1[1], p2[1])), Math.max(p1[1], p2[1]))
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, clamp(p1[1] + (p2[1] - p0[1]) / 6)]
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, clamp(p2[1] - (p3[1] - p1[1]) / 6)]
      d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`
    }
    return d
  }
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cn('w-full overflow-visible', className)} style={{ height }}>
      <defs>
        {series.map((s) => (
          <linearGradient key={s.key} id={`spark-${s.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={w} y1={height * f} y2={height * f} stroke="var(--color-rule)" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
      ))}
      {series.map((s) => {
        const d = path(s.data)
        if (!d) return null
        const lastX = ((s.data.length - 1) / (n - 1)) * w
        return (
          <g key={s.key}>
            <path d={`${d} L ${lastX} ${height} L 0 ${height} Z`} fill={`url(#spark-${s.key})`} />
            <path d={d} fill="none" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </g>
        )
      })}
    </svg>
  )
}

// 品牌标: 几何盾形 + 琥珀渐变
export function Logo({ className }) {
  const id = React.useId()
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-accent-2)" />
        </linearGradient>
      </defs>
      <path d="M16 2.5 27.5 7v8.6c0 6.9-4.7 11.9-11.5 13.9C9.2 27.5 4.5 22.5 4.5 15.6V7L16 2.5Z" fill={`url(#${id})`} />
      <path d="M11 11.5h10M16 11.5v10" stroke="var(--color-accent-ink)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}
