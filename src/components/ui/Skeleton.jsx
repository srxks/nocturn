export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'rounded-xl',
  ...props
}) {
  return (
    <div
      className={`animate-pulse bg-white/[0.06] ${rounded} ${className}`}
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
      }}
      aria-hidden="true"
      {...props}
    />
  )
}

export default Skeleton
