import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { ToastContext } from './ToastContextObject'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, typeOrOptions = 'info', maybeDuration = 3500, maybeAction = null) => {
    const isOptionsObj = typeof typeOrOptions === 'object' && typeOrOptions !== null
    const type = isOptionsObj ? (typeOrOptions.type || 'info') : (typeOrOptions || 'info')
    const duration = isOptionsObj
      ? (typeOrOptions.duration !== undefined ? typeOrOptions.duration : 3500)
      : (maybeDuration !== undefined ? maybeDuration : 3500)
    const action = isOptionsObj ? (typeOrOptions.action || null) : (maybeAction || null)

    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    setToasts((prev) => [...prev, { id, message, type, action }])

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              role="status"
              className={`pointer-events-auto p-3 sm:p-3.5 rounded-2xl border backdrop-blur-xl shadow-xl flex items-center justify-between gap-3 text-xs font-medium ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                  : toast.type === 'error'
                  ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                  : 'bg-nocturn-card/95 border-nocturn-border text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : toast.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-nocturn-accent shrink-0" />
                )}
                <span className="truncate">{toast.message}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        toast.action.onClick?.()
                      } finally {
                        removeToast(toast.id)
                      }
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase bg-nocturn-accent/20 hover:bg-nocturn-accent/30 text-nocturn-accent-bright border border-nocturn-accent/40 rounded-lg transition-all active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(var(--color-nocturn-accent-rgb),0.2)]"
                  >
                    {toast.action.label || 'Undo'}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Dismiss toast"
                  onClick={() => removeToast(toast.id)}
                  className="p-1 text-white/50 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
