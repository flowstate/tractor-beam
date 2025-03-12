import React, { useEffect, useState, useRef } from 'react'
import { motion, useTransform, useScroll } from 'motion/react'

interface ScrollSceneProps {
  children: React.ReactNode
  startAt?: number // percentage of viewport height (0-100)
  endAt?: number // percentage of viewport height (0-100)
  enterAnimation?: {
    opacity?: [number, number]
    scale?: [number, number]
    x?: [number, number]
    y?: [number, number]
  }
  exitAnimation?: {
    opacity?: [number, number]
    scale?: [number, number]
    x?: [number, number]
    y?: [number, number]
  }
  transformAnimation?: {
    opacity?: [number, number]
    scale?: [number, number]
    x?: [number, number]
    y?: [number, number]
  }
  className?: string
  style?: React.CSSProperties
}

export const ScrollScene: React.FC<ScrollSceneProps> = ({
  children,
  startAt = 0,
  endAt = 100,
  enterAnimation = { opacity: [0, 1] },
  exitAnimation = { opacity: [1, 0] },
  transformAnimation,
  className = '',
  style = {},
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [elementTop, setElementTop] = useState(0)
  const [clientHeight, setClientHeight] = useState(0)

  const { scrollY } = useScroll()

  // Calculate when this element should start and end its animations
  useEffect(() => {
    if (!ref.current) return

    const setValues = () => {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return

      // Get the element's position relative to the document
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const newElementTop = rect.top + scrollTop

      setElementTop(newElementTop)
      setClientHeight(window.innerHeight)
    }

    setValues()
    document.addEventListener('resize', setValues)
    return () => document.removeEventListener('resize', setValues)
  }, [ref])

  // Calculate the start and end scroll positions
  const startPosition = elementTop - clientHeight * (startAt / 100)
  const endPosition = elementTop - clientHeight * (endAt / 100)

  // Create motion values for each animation property
  const getMotionValue = (property: string, defaultValue: [number, number]) => {
    const enterValue = enterAnimation[property] || defaultValue
    const exitValue = exitAnimation[property] || [enterValue[1], enterValue[0]]
    const transformValue = transformAnimation?.[property]

    if (transformValue) {
      // If we have a transform animation, we need three phases
      return useTransform(
        scrollY,
        [startPosition, elementTop, endPosition],
        [enterValue[0], enterValue[1], exitValue[1]]
      )
    } else {
      // Otherwise just enter and exit
      return useTransform(
        scrollY,
        [startPosition, elementTop, endPosition],
        [enterValue[0], enterValue[1], exitValue[1]]
      )
    }
  }

  const opacity = getMotionValue('opacity', [0, 1])
  const scale = getMotionValue('scale', [1, 1])
  const x = getMotionValue('x', [0, 0])
  const y = getMotionValue('y', [0, 0])

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity,
        scale,
        x,
        y,
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </motion.div>
  )
}

// A simpler component for pinning content to the screen during scroll
interface ScrollPinProps {
  children: React.ReactNode
  pinFor?: number // how many viewport heights to pin for
  className?: string
}

export const ScrollPin: React.FC<ScrollPinProps> = ({
  children,
  pinFor = 1,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', `${pinFor * 100}vh end`],
  })

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{ height: `${(pinFor + 1) * 100}vh` }}
    >
      <motion.div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}
