import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

// 标签: 阅读体小一号, 句首大写,  muted 色, 不用等宽不用大写追踪
const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-[13px] font-medium text-muted leading-none', className)}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }
