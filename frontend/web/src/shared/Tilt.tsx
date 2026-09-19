import { useTilt } from './useTilt'

type Props = {
  as?: React.ElementType
  max?: number
  className?: string
  children?: React.ReactNode
} & Record<string, unknown>

/** Any element (a div, a li, a router Link) that tilts toward the pointer and catches a moving glare. */
export default function Tilt({ as: Tag = 'div', max, className = '', children, ...rest }: Props) {
  const ref = useTilt<HTMLElement>(max)
  return (
    <Tag ref={ref} className={`tilt ${className}`} {...rest}>
      {children}
    </Tag>
  )
}
