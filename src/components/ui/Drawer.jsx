import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export function Drawer({
  isOpen = false,
  onClose,
  title,
  description,
  children,
  side = 'right',
  width = 'max-w-md',
  className = '',
}) {
  // ESC key listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const slideVariants = {
    right: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
    },
    left: {
      initial: { x: '-100%' },
      animate: { x: 0 },
      exit: { x: '-100%' },
    },
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
    },
  }

  const currentVariant = slideVariants[side] || slideVariants.right

  const positionClass =
    side === 'bottom'
      ? 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t'
      : side === 'left'
      ? `inset-y-0 left-0 h-full w-full ${width} border-r`
      : `inset-y-0 right-0 h-full w-full ${width} border-l`

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <motion.div
            initial={currentVariant.initial}
            animate={currentVariant.animate}
            exit={currentVariant.exit}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            className={`fixed ${positionClass} bg-nocturn-card border-nocturn-border shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col z-10 ${className}`}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-4 p-5 border-b border-nocturn-border/80 shrink-0">
              <div className="space-y-0.5 min-w-0 flex-1">
                {title && (
                  <h2 className="text-base font-semibold tracking-tight text-white">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-xs text-nocturn-muted leading-relaxed">
                    {description}
                  </p>
                )}
              </div>

              <button
                type="button"
                aria-label="Close drawer"
                onClick={onClose}
                className="p-1.5 rounded-lg text-nocturn-muted hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default Drawer
