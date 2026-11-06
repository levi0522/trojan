import * as React from 'react'
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// 极简 toast: 成功 cool / 失败 bad / 提示默认
const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const push = useCallback((message, variant = 'default') => {
    const id = ++idRef.current
    setToasts((list) => [...list, { id, message, variant }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3200)
  }, [])

  const api = React.useMemo(
    () => ({
      success: (m) => api0(m, 'ok'),
      error: (m) => api0(m, 'bad'),
      info: (m) => api0(m, 'default'),
    }),
    []
  )
  function api0(m, v) {
    push(m, v)
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto rounded-pill border px-3 py-2 text-sm',
              t.variant === 'ok' && 'border-rule bg-okSoft text-ok',
              t.variant === 'bad' && 'border-rule bg-badSoft text-bad',
              t.variant === 'default' && 'border-rule2 bg-paper2 text-ink'
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
