import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }) {
  return <div className={cn('shimmer rounded-pill', className)} {...props} />
}

export { Skeleton }
