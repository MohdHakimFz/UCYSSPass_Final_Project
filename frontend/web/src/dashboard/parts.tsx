import { Link } from 'react-router-dom'
import { Breadcrumb, BreadcrumbItem, Pagination, Tile } from '@carbon/react'
import type { ReactNode } from 'react'

/** Title, one line of context, and the main actions, with a breadcrumb trail above when the page is nested. */
export function PageHeader({
  title,
  description,
  actions,
  crumbs,
  status,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  crumbs?: { label: string; to?: string }[]
  status?: ReactNode
}) {
  return (
    <header className="page-header">
      {crumbs && (
        <Breadcrumb noTrailingSlash>
          {crumbs.map((c) => (
            <BreadcrumbItem key={c.label} href={c.to ? '#' : undefined} isCurrentPage={!c.to}>
              {c.to ? <Link to={c.to}>{c.label}</Link> : c.label}
            </BreadcrumbItem>
          ))}
        </Breadcrumb>
      )}
      <div className="page-header-row">
        <div className="page-header-text">
          <h1>
            {title} {status}
          </h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </header>
  )
}

/** A few points drawn as a line, to show which way a number is heading. */
export function Sparkline({ values, tone = 'blue' }: { values: number[]; tone?: 'blue' | 'green' }) {
  const max = Math.max(1, ...values)
  const w = 120
  const h = 32
  const step = values.length > 1 ? w / (values.length - 1) : w
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - (v / max) * (h - 6)).toFixed(1)}`)
  const area = `0,${h} ${points.join(' ')} ${w},${h}`

  return (
    <svg className="spark" data-tone={tone} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Trend over the last 14 days">
      <polygon points={area} className="spark-fill" />
      <polyline points={points.join(' ')} className="spark-line" fill="none" />
    </svg>
  )
}

/** One headline number with a label, an optional note and an optional trend. */
export function StatTile({
  label,
  value,
  unit,
  note,
  trend,
  tone,
  icon,
}: {
  label: string
  value: ReactNode
  unit?: string
  note?: ReactNode
  trend?: number[]
  tone?: 'blue' | 'green' | 'red' | 'amber'
  icon?: ReactNode
}) {
  return (
    <Tile className="stat" data-tone={tone}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon}
      </div>
      <strong className="stat-value">
        {value}
        {unit && <small>{unit}</small>}
      </strong>
      {note && <span className="stat-note">{note}</span>}
      {trend && <Sparkline values={trend} tone={tone === 'green' ? 'green' : 'blue'} />}
    </Tile>
  )
}

/** What a list shows when there is nothing in it yet: what it is for, and the way to fill it. */
export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export const money = (n: number | string) => `RM ${Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Page numbers and page size for a list that the server pages. */
export function TablePager({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (page: number, pageSize: number) => void
}) {
  return (
    <Pagination
      page={page}
      pageSize={pageSize}
      pageSizes={[10, 20, 50]}
      totalItems={total}
      onChange={({ page: p, pageSize: size }: { page: number; pageSize: number }) => onChange(p, size)}
    />
  )
}
