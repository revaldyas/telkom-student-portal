'use client'

import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'

type Props = ImgHTMLAttributes<HTMLImageElement>

export default function SkeletonImage({ className = '', onLoad, onError, src, ...props }: Props) {
  const ref = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(Boolean(ref.current?.complete && ref.current.naturalWidth > 0))
  }, [src])

  return <img
    {...props}
    ref={ref}
    src={src}
    className={`site-image ${loaded ? 'is-loaded' : 'is-loading'} ${className}`.trim()}
    onLoad={(event) => { setLoaded(true); onLoad?.(event) }}
    onError={(event) => { setLoaded(true); onError?.(event) }}
  />
}
