import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { Building2, Bell } from 'lucide-react'
import { isPast } from 'date-fns'
import { scoreMeta } from '../constants'

export default function ApplicationCard({ app, dragging = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: app.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const sm = scoreMeta(app.priority_score)
  const followUpOverdue =
    app.follow_up_at && isPast(new Date(app.follow_up_at))

  const inner = (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-3)] p-3 space-y-2">
      {/* Top row: role title + priority badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-snug text-white">
          {app.role_title}
        </div>
        {app.priority_score != null && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: sm.bg, color: sm.color }}
            title={`Priority: ${sm.label} (${app.priority_score})`}
          >
            {app.priority_score}
          </span>
        )}
      </div>

      {/* Company name */}
      {app.company?.name && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Building2 size={12} />
          <span className="truncate">{app.company.name}</span>
        </div>
      )}

      {/* Follow-up overdue badge */}
      {followUpOverdue && (
        <div className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
          <Bell size={11} />
          Follow-up overdue
        </div>
      )}
    </div>
  )

  if (dragging) {
    return (
      <div className="cursor-grabbing rounded-lg border border-[var(--accent)] bg-[var(--bg-3)] p-3 shadow-lg">
        <div className="text-sm font-medium text-white">{app.role_title}</div>
        {app.company?.name && (
          <div className="mt-1 text-xs text-[var(--text-muted)]">{app.company.name}</div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <Link to={`/applications/${app.id}`} onClick={(e) => e.stopPropagation?.()}>
        {inner}
      </Link>
    </div>
  )
}
