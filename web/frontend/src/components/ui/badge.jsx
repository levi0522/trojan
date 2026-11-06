import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// chip 只承载状态: 标签体 + 1px 边线 + 语义浅色底
const badgeVariants = cva(
  'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'border-rule text-muted',
        accent: 'border-transparent bg-accentSoft text-accent',
        cool: 'border-transparent bg-coolSoft text-cool',
        ok: 'border-transparent bg-okSoft text-ok',
        bad: 'border-transparent bg-badSoft text-bad',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
