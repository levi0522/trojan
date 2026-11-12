import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded-pill border border-rule bg-paper3 px-3 py-2 text-sm text-ink placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50 transition-[border-color,box-shadow] duration-150 hover:border-rule2 focus:border-cool/60 focus:outline-none focus:ring-4 focus:ring-cool/15 focus-visible:outline-none',
      className
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Textarea }
