import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }) {
  return <div className={cn('rounded-pill bg-paper3', className)} {...props} />
}

export { Skeleton }
