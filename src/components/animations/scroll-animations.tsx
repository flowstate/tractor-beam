import React from 'react'
import { useInView } from 'react-intersection-observer'
import { motion } from 'motion/react' // Optional but powerful

type Direction = 'up' | 'down' | 'left' | 'right'
type From = 'left' | 'right' | 'top' | 'bottom'

interface AnimationProps {
  children: React.ReactNode
  threshold?: number
  triggerOnce?: boolean
  delay?: number
  duration?: number
}

// FadeIn component
interface FadeInProps extends AnimationProps {
  direction?: Direction
  distance?: number
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  threshold = 0.2,
  triggerOnce = true,
  direction = 'up',
  distance = 50,
  delay = 0,
  duration = 0.5,
}) => {
  const [ref, inView] = useInView({
    threshold,
    triggerOnce,
  })

  const directionToTranslate = {
    up: `translate3d(0, ${distance}px, 0)`,
    down: `translate3d(0, -${distance}px, 0)`,
    left: `translate3d(${distance}px, 0, 0)`,
    right: `translate3d(-${distance}px, 0, 0)`,
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, transform: directionToTranslate[direction] }}
      animate={{
        opacity: inView ? 1 : 0,
        transform: inView
          ? 'translate3d(0, 0, 0)'
          : directionToTranslate[direction],
      }}
      transition={{ duration, delay }}
    >
      {children}
    </motion.div>
  )
}

// ZoomIn component
interface ZoomProps extends AnimationProps {
  scale?: number
}

export const ZoomIn: React.FC<ZoomProps> = ({
  children,
  threshold = 0.2,
  triggerOnce = true,
  scale = 0.8,
  delay = 0,
  duration = 0.5,
}) => {
  const [ref, inView] = useInView({
    threshold,
    triggerOnce,
  })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale }}
      animate={{
        opacity: inView ? 1 : 0,
        scale: inView ? 1 : scale,
      }}
      transition={{ duration, delay }}
    >
      {children}
    </motion.div>
  )
}

// SlideIn component
interface SlideInProps extends AnimationProps {
  from?: From
  distance?: number
}

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  threshold = 0.2,
  triggerOnce = true,
  from = 'left',
  distance = 100,
  delay = 0,
  duration = 0.5,
}) => {
  const [ref, inView] = useInView({
    threshold,
    triggerOnce,
  })

  const fromToValues = {
    left: { x: -distance, y: 0 },
    right: { x: distance, y: 0 },
    top: { x: 0, y: -distance },
    bottom: { x: 0, y: distance },
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...fromToValues[from] }}
      animate={{
        opacity: inView ? 1 : 0,
        x: inView ? 0 : fromToValues[from].x,
        y: inView ? 0 : fromToValues[from].y,
      }}
      transition={{ duration, delay }}
    >
      {children}
    </motion.div>
  )
}

// Parallax component
interface ParallaxProps extends AnimationProps {
  speed?: number
}

export const Parallax: React.FC<ParallaxProps> = ({
  children,
  speed = 0.5,
}) => {
  const [ref, inView] = useInView({
    threshold: 0,
    triggerOnce: false,
  })

  return (
    <motion.div
      ref={ref}
      style={{
        willChange: 'transform',
        transformStyle: 'preserve-3d',
      }}
      animate={{
        y: inView ? speed * -50 : 0,
      }}
      transition={{ type: 'tween', ease: 'linear' }}
    >
      {children}
    </motion.div>
  )
}

// Sequence component for staggered animations
interface SequenceProps {
  children: React.ReactNode[]
  staggerDelay?: number
  containerProps?: React.HTMLAttributes<HTMLDivElement>
  animation?: 'fade' | 'zoom' | 'slide'
  direction?: Direction
  from?: From
}

export const Sequence: React.FC<SequenceProps> = ({
  children,
  staggerDelay = 0.1,
  containerProps = {},
  animation = 'fade',
  direction = 'up',
  from = 'left',
}) => {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
    <div ref={ref} {...containerProps}>
      {React.Children.map(children, (child, index) => {
        const delay = index * staggerDelay

        switch (animation) {
          case 'fade':
            return (
              <FadeIn direction={direction} delay={delay}>
                {child}
              </FadeIn>
            )
          case 'zoom':
            return <ZoomIn delay={delay}>{child}</ZoomIn>
          case 'slide':
            return (
              <SlideIn from={from} delay={delay}>
                {child}
              </SlideIn>
            )
          default:
            return child
        }
      })}
    </div>
  )
}
