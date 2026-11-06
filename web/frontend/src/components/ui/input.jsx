import * as React from 'react'
import { cn } from '@/lib/utils'

// 输入框落在最深一级表面, 1px 边线
const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-9 w-full rounded-pill border border-rule bg-paper3 px-3 py-1 text-sm text-ink placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50 focus:border-rule2',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export { Input }
