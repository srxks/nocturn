import { useContext } from 'react'
import { ToastContext } from './ToastContextObject'

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      addToast: (msg, type) => console.log(`[Toast ${type}]:`, msg),
      removeToast: () => {},
    }
  }
  return context
}
