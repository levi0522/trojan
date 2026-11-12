import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// chip 只承载状态; dot=true 时带呼吸点
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'border-rule bg-paper3 text-muted',
        accent: 'border-accent/25 bg-accentSoft text-accent',
        cool: 'border-cool/25 bg-coolSoft text-cool',
        ok: 'border-ok/25 bg-okSoft text-ok',
        bad: 'border-bad/25 bg-badSoft text-bad',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

function Badge({ className, variant, dot, pulse, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn(pulse ? 'pulse-dot' : 'inline-block h-1.5 w-1.5 rounded-full bg-current', pulse && '!h-1.5 !w-1.5')} />}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
