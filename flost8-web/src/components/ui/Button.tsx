import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'
import { EASE } from '../../lib/motion'

// Native event handlers that conflict with framer-motion's HTMLMotionProps types
type ConflictingHandlers =
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onTransitionEnd'

type Variant = 'primary' | 'outline' | 'inverse'
type Size = 'md' | 'lg'

const VARIANT_STYLES: Record<Variant, string> = {
  primary: 'rounded-full bg-red text-cream border-2 border-off-black shadow-pop font-body italic',
  outline: 'rounded-full border-2 border-current bg-transparent',
  inverse: 'bg-cream text-navy rounded-full',
}

const SIZE_STYLES: Record<Size, string> = {
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
}

const SHADOW_HOVER: Record<Variant, string> = {
  primary: '0 10px 0 rgba(17,17,24,0.85)',
  outline: 'none',
  inverse: 'none',
}

type CommonProps = {
  variant?: Variant
  size?: Size
  to?: string
  href?: string
  icon?: ReactNode
  children?: ReactNode
  className?: string
}

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps | ConflictingHandlers> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | ConflictingHandlers>

export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  icon,
  children,
  className = '',
  type,
  ...rest
}: ButtonProps) {
  const shouldReduce = useReducedMotion()

  const classes = [
    'inline-flex items-center justify-center gap-2 transition-colors',
    VARIANT_STYLES[variant],
    SIZE_STYLES[size],
    className,
  ].join(' ')

  const motionProps = shouldReduce
    ? {}
    : {
        whileHover: { y: -2, boxShadow: SHADOW_HOVER[variant] },
        whileTap: { scale: 0.98 },
        transition: { duration: 0.3, ease: EASE },
      }

  const content = (
    <>
      {children}
      {icon}
    </>
  )

  if (to) {
    return (
      <motion.div className="inline-block" {...motionProps}>
        <Link to={to} className={classes} {...(rest as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, ConflictingHandlers>)}>
          {content}
        </Link>
      </motion.div>
    )
  }

  if (href) {
    return (
      <motion.a
        href={href}
        className={classes}
        {...motionProps}
        {...(rest as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, ConflictingHandlers>)}
      >
        {content}
      </motion.a>
    )
  }

  return (
    <motion.button
      type={type ?? 'button'}
      className={classes}
      {...motionProps}
      {...(rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, ConflictingHandlers>)}
    >
      {content}
    </motion.button>
  )
}
