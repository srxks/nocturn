import { useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'

export function useCountUp(target, duration = 0.6) {
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 })
  useEffect(() => {
    spring.set(target)
  }, [target, spring])

  return useTransform(spring, (v) => Math.round(v).toLocaleString())
}
