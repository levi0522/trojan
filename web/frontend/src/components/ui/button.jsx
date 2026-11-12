import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// 主按钮: 琥珀渐变 + 内高光; 次按钮: 发线描边; 所有按钮按下微缩
const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-pill text-sm font-medium transition-[background-color,box-shadow,transform,opacity,color] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-accent text-accentInk shadow-[inset_0_1px_0_oklch(100%_0_0/0.35),0_6px_20px_-8px_var(--color-accent)] hover:shadow-[inset_0_1px_0_oklch(100%_0_0/0.35),0_10px_28px_-8px_var(--color-accent)] hover:brightness-105',
        outline: 'border border-rule2 bg-paper2 text-ink hover:border-muted/60 hover:bg-paper3',
        ghost: 'text-ink2 hover:bg-paper3 hover:text-ink',
        danger: 'border border-bad/40 bg-badSoft text-bad hover:bg-bad hover:text-paper',
        cool: 'bg-coolSoft text-cool hover:brightness-110',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3 text-[13px]',
        lg: 'h-11 px-6 text-[15px]',
        icon: 'h-9 w-9',
        iconSm: 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
})
Button.displayName = 'Button'

export { Button, buttonVariants }
