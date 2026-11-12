import * as React from 'react'
import { cn } from '@/lib/utils'
import { useSpotlight } from '@/components/fx'

// 面板: 发线边 + 柔和投影, 鼠标经过时边缘出现跟随光
const Card = React.forwardRef(({ className, spotlight = true, onMouseMove, ...props }, ref) => {
  const track = useSpotlight()
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        if (spotlight) track(e)
        onMouseMove?.(e)
      }}
      className={cn(
        'rounded-card border border-rule bg-paper2 shadow-[var(--shadow-card)] transition-colors',
        spotlight && 'spotlight',
        className
      )}
      {...props}
    />
  )
})
Card.displayName = 'Card'

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col gap-1 p-5', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('flex items-center gap-2 text-[15px] font-medium leading-none', className)} {...props} />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-[13px] text-muted', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-5 pt-0', className)} {...props} />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
