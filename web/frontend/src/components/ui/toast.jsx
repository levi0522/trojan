import * as React from 'react'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// toast: 右上角弹簧堆叠, 带倒计时进度线
const ToastContext = createContext(null)
const DURATION = 3200

const ICONS = { ok: CheckCircle2, bad: XCircle, default: Info }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (message, variant = 'default') => {
      const id = ++idRef.current
      setToasts((list) => [...list.slice(-3), { id, message, variant }])
      setTimeout(() => dismiss(id), DURATION)
    },
    [dismiss]
  )

  const api = useMemo(
    () => ({
      success: (m) => push(m, 'ok'),
      error: (m) => push(m, 'bad'),
      info: (m) => push(m, 'default'),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:w-80">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.variant]
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                onClick={() => dismiss(t.id)}
                className="pointer-events-auto relative w-full cursor-pointer overflow-hidden rounded-[12px] border border-rule2 bg-paper2/90 px-3.5 py-3 text-sm text-ink shadow-[var(--shadow-pop)] backdrop-blur-xl"
              >
                <div className="flex items-start gap-2.5">
                  <Icon
                    className={cn(
                      'mt-px h-[18px] w-[18px] shrink-0',
                      t.variant === 'ok' && 'text-ok',
                      t.variant === 'bad' && 'text-bad',
                      t.variant === 'default' && 'text-cool'
                    )}
                  />
                  <span className="leading-snug">{t.message}</span>
                </div>
                <motion.div
                  className={cn(
                    'absolute bottom-0 left-0 h-[2px] origin-left',
                    t.variant === 'ok' ? 'bg-ok' : t.variant === 'bad' ? 'bg-bad' : 'bg-cool'
                  )}
                  style={{ width: '100%' }}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: DURATION / 1000, ease: 'linear' }}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
