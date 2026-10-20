import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Briefcase, Building2, Send, MessageSquare, Award, XCircle, Target,
  TrendingUp, Download,
} from 'lucide-react'
import { format, subWeeks, startOfWeek, isWithinInterval } from 'date-fns'
import { applicationsApi, companiesApi } from '../api'
import { STATUS_META, STATUS_ORDER, scoreMeta } from '../constants'
import { exportToCsv } from '../utils/csvExport'

export default function Dashboard() {
  const { data: apps = [], isLoading: appsLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.list(),
  })
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  })

  const loading = appsLoading || companiesLoading

  const counts = apps.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1
    return acc
  }, {})

  const stats = [
    { key: 'total',     label: 'Total',      value: apps.length,          icon: Briefcase,    color: '#6366f1' },
    { key: 'applied',   label: 'Applied',    value: counts.applied   || 0, icon: Send,         color: '#3b82f6' },
    { key: 'interview', label: 'Interviews', value: counts.interview || 0, icon: MessageSquare,color: '#f59e0b' },
    { key: 'offer',     label: 'Offers',     value: counts.offer     || 0, icon: Award,        color: '#10b981' },
    { key: 'rejected',  label: 'Rejected',   value: counts.rejected  || 0, icon: XCircle,      color: '#ef4444' },
    { key: 'wishlist',  label: 'Wishlist',   value: counts.wishlist  || 0, icon: Target,       color: '#8b5cf6' },
    { key: 'companies', label: 'Companies',  value: companies.length,      icon: Building2,    color: '#06b6d4' },
  ]

  // ── Response / offer rates ──────────────────────────────────────
  const responded = (counts.interview || 0) + (counts.offer || 0) + (counts.rejected || 0)
  const appliedTotal = (counts.applied || 0) + responded
  const responseRate = appliedTotal > 0 ? Math.round((responded / appliedTotal) * 100) : 0
  const offerRate    = responded     > 0 ? Math.round(((counts.offer || 0) / responded) * 100) : 0

  // ── Applications per week (last 8 weeks) ───────────────────────
  const weeklyData = buildWeeklyData(apps, 8)

  const recent = [...apps].slice(0, 5)

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Your job search at a glance</p>
        </div>
        <button
          onClick={() => exportToCsv(apps)}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-2)] px-4 py-2 text-sm font-medium text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-white"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="text-[var(--text-muted)]">Loading…</div>
      ) : (
        <>
          {/* ── Stat cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon
              return (
                <div
                  key={s.key}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
                    <Icon size={16} style={{ color: s.color }} />
                  </div>
                  <div className="mt-2 text-3xl font-bold text-white">{s.value}</div>
                </div>
              )
            })}
          </div>

          {/* ── Charts row ─────────────────────────────────────── */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {/* Weekly bar chart */}
            <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-5">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-white">Applications per week</h2>
              </div>
              <WeeklyBarChart data={weeklyData} />
            </div>

            {/* Funnel + rate cards */}
            <div className="space-y-4">
              {/* Status funnel */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-5">
                <h2 className="mb-3 text-sm font-semibold text-white">Pipeline funnel</h2>
                <FunnelChart counts={counts} total={apps.length} />
              </div>

              {/* Rate pills */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-4 text-center">
                  <div className="text-xs text-[var(--text-muted)]">Response rate</div>
                  <div className="mt-1 text-2xl font-bold text-white">{responseRate}%</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-4 text-center">
                  <div className="text-xs text-[var(--text-muted)]">Offer rate</div>
                  <div className="mt-1 text-2xl font-bold" style={{ color: '#10b981' }}>
                    {offerRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Recent applications ────────────────────────────── */}
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent applications</h2>
              <Link to="/applications" className="text-sm font-medium text-[var(--accent)] hover:underline">
                View all →
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">
                No applications yet.{' '}
                <Link to="/applications" className="text-[var(--accent)] hover:underline">
                  Add your first one →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-2)]">
                {recent.map((app) => {
                  const meta = STATUS_META[app.status]
                  const sm   = scoreMeta(app.priority_score)
                  return (
                    <Link
                      key={app.id}
                      to={`/applications/${app.id}`}
                      className="flex items-center justify-between gap-4 p-4 transition hover:bg-[var(--bg-3)]"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">{app.role_title}</div>
                        <div className="truncate text-sm text-[var(--text-muted)]">{app.company?.name}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {/* Priority score pill */}
                        {app.priority_score != null && (
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ background: sm.bg, color: sm.color }}
                          >
                            {app.priority_score}
                          </span>
                        )}
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{ background: `${meta.color}22`, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Weekly bar chart (pure SVG) ─────────────────────────────────── */
function WeeklyBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const H = 80   // bar area height px
  const BAR_W = 24
  const GAP = 10

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: data.length * (BAR_W + GAP) }}>
        <svg
          width="100%"
          viewBox={`0 0 ${data.length * (BAR_W + GAP)} ${H + 24}`}
          className="overflow-visible"
        >
          {data.map((d, i) => {
            const barH = Math.max((d.count / max) * H, d.count > 0 ? 4 : 0)
            const x = i * (BAR_W + GAP)
            const y = H - barH
            return (
              <g key={d.label}>
                {/* bar */}
                <rect
                  x={x}
                  y={y}
                  width={BAR_W}
                  height={barH}
                  rx={4}
                  fill="#6366f1"
                  opacity={0.85}
                />
                {/* count label */}
                {d.count > 0 && (
                  <text
                    x={x + BAR_W / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#e6e8ec"
                  >
                    {d.count}
                  </text>
                )}
                {/* week label */}
                <text
                  x={x + BAR_W / 2}
                  y={H + 16}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#8b92a0"
                >
                  {d.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

/* ── Funnel chart (horizontal bars) ─────────────────────────────── */
function FunnelChart({ counts, total }) {
  if (total === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No data yet.</p>
  }
  return (
    <div className="space-y-2">
      {STATUS_ORDER.map((s) => {
        const meta = STATUS_META[s]
        const val  = counts[s] || 0
        const pct  = total > 0 ? (val / total) * 100 : 0
        return (
          <div key={s}>
            <div className="mb-0.5 flex items-center justify-between text-xs">
              <span style={{ color: meta.color }}>{meta.label}</span>
              <span className="text-[var(--text-muted)]">{val}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-3)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: meta.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── helpers ─────────────────────────────────────────────────────── */
function buildWeeklyData(apps, numWeeks) {
  const now = new Date()
  return Array.from({ length: numWeeks }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(now, numWeeks - 1 - i))
    const weekEnd   = startOfWeek(subWeeks(now, numWeeks - 2 - i))
    const count = apps.filter((a) => {
      const d = new Date(a.created_at)
      return isWithinInterval(d, { start: weekStart, end: weekEnd })
    }).length
    return { label: format(weekStart, 'MMM d'), count }
  })
}
