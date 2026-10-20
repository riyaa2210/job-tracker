import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Calendar, ExternalLink, Trash2, Plus, Building2,
  Pencil, FileText, Bell, BellOff, Activity,
} from 'lucide-react'
import { format, isPast, formatDistanceToNow } from 'date-fns'

import { applicationsApi, interviewsApi, activityApi, companiesApi } from '../api'
import { STATUS_ORDER, STATUS_META, OUTCOME_META, OUTCOME_OPTIONS, scoreMeta, EVENT_LABELS } from '../constants'
import EditApplicationModal from '../components/EditApplicationModal'

export default function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const appId = Number(id)

  const [editOpen, setEditOpen] = useState(false)

  const { data: app, isLoading } = useQuery({
    queryKey: ['applications', appId],
    queryFn: () => applicationsApi.get(appId),
  })
  const { data: interviews = [] } = useQuery({
    queryKey: ['interviews', appId],
    queryFn: () => interviewsApi.list(appId),
  })
  const { data: events = [] } = useQuery({
    queryKey: ['activity', appId],
    queryFn: () => activityApi.list(appId),
  })
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  })

  const updateApp = useMutation({
    mutationFn: (data) => applicationsApi.update(appId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      qc.invalidateQueries({ queryKey: ['activity', appId] })
      toast.success('Updated')
    },
  })

  const deleteApp = useMutation({
    mutationFn: () => applicationsApi.delete(appId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      toast.success('Deleted')
      navigate('/applications')
    },
  })

  const createInterview = useMutation({
    mutationFn: (data) => interviewsApi.create(appId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews', appId] })
      qc.invalidateQueries({ queryKey: ['activity', appId] })
      qc.invalidateQueries({ queryKey: ['applications'] })
      toast.success('Interview added')
    },
  })

  const updateInterview = useMutation({
    mutationFn: ({ id: iid, data }) => interviewsApi.update(iid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews', appId] })
      qc.invalidateQueries({ queryKey: ['activity', appId] })
    },
  })

  const deleteInterview = useMutation({
    mutationFn: (iid) => interviewsApi.delete(iid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews', appId] })
      qc.invalidateQueries({ queryKey: ['activity', appId] })
      qc.invalidateQueries({ queryKey: ['applications'] })
    },
  })

  if (isLoading) return <div className="text-[var(--text-muted)]">Loading…</div>
  if (!app) return <div className="text-[var(--text-muted)]">Not found</div>

  const meta = STATUS_META[app.status]
  const score = app.priority_score
  const sm = scoreMeta(score)

  const followUp = app.follow_up_at ? new Date(app.follow_up_at) : null
  const followUpOverdue = followUp && isPast(followUp)

  return (
    <>
      <Link
        to="/applications"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to applications
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main column ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Header card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-white">{app.role_title}</h1>
                <div className="mt-2 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <Building2 size={14} />
                  <span>{app.company?.name}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setEditOpen(true)}
                  className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-3)] hover:text-white"
                  title="Edit application"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this application?')) deleteApp.mutate()
                  }}
                  className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-400"
                  title="Delete application"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Links row */}
            <div className="mt-4 flex flex-wrap gap-4">
              {app.job_url && (
                <a
                  href={app.job_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
                >
                  <ExternalLink size={14} />
                  View job posting
                </a>
              )}
              {app.resume_url && (
                <a
                  href={app.resume_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
                >
                  <FileText size={14} />
                  Resume / cover letter
                </a>
              )}
            </div>

            {/* Status picker */}
            <div className="mt-6">
              <label className="mb-2 block text-xs font-medium text-[var(--text-muted)]">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUS_ORDER.map((s) => {
                  const m = STATUS_META[s]
                  const active = app.status === s
                  return (
                    <button
                      key={s}
                      onClick={() => updateApp.mutate({ status: s })}
                      className="rounded-full px-3 py-1.5 text-xs font-medium transition"
                      style={{
                        background: active ? m.color : `${m.color}22`,
                        color: active ? 'white' : m.color,
                      }}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            {app.notes && (
              <div className="mt-6">
                <div className="mb-2 text-xs font-medium text-[var(--text-muted)]">Notes</div>
                <div className="whitespace-pre-wrap text-sm text-[var(--text)]">{app.notes}</div>
              </div>
            )}
          </div>

          {/* Interviews */}
          <InterviewsSection
            interviews={interviews}
            onAdd={(data) => createInterview.mutate(data)}
            onOutcomeChange={(iid, outcome) => updateInterview.mutate({ id: iid, data: { outcome } })}
            onDelete={(iid) => deleteInterview.mutate(iid)}
          />

          {/* Activity Timeline */}
          <ActivityTimeline events={events} />
        </div>

        {/* ── Side column ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Priority Score */}
          <div
            className="rounded-xl border p-5"
            style={{ borderColor: sm.color + '55', background: sm.bg }}
          >
            <div className="mb-1 text-xs font-medium" style={{ color: sm.color }}>
              Priority score
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">
                {score != null ? score : '—'}
              </span>
              <span className="mb-0.5 text-sm font-medium" style={{ color: sm.color }}>
                {sm.label}
              </span>
            </div>
            <div className="mt-2 text-xs text-[var(--text-muted)]">
              Based on stage, recency, follow-ups &amp; interviews
            </div>
          </div>

          {/* Current status */}
          <div
            className="rounded-xl border p-5"
            style={{ borderColor: `${meta.color}55`, background: `${meta.color}11` }}
          >
            <div className="text-xs font-medium" style={{ color: meta.color }}>
              Current status
            </div>
            <div className="mt-1 text-lg font-semibold text-white">{meta.label}</div>
          </div>

          {/* Follow-up */}
          {followUp && (
            <div
              className="rounded-xl border p-5"
              style={{
                borderColor: followUpOverdue ? '#ef444455' : '#f59e0b55',
                background:  followUpOverdue ? '#ef444411' : '#f59e0b11',
              }}
            >
              <div
                className="mb-1 flex items-center gap-1.5 text-xs font-medium"
                style={{ color: followUpOverdue ? '#ef4444' : '#f59e0b' }}
              >
                {followUpOverdue ? <BellOff size={13} /> : <Bell size={13} />}
                {followUpOverdue ? 'Follow-up overdue' : 'Follow-up scheduled'}
              </div>
              <div className="text-sm text-white">{format(followUp, 'PP')}</div>
              <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                {followUpOverdue
                  ? `${formatDistanceToNow(followUp)} ago`
                  : `in ${formatDistanceToNow(followUp)}`}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-5 space-y-3">
            {app.applied_at && (
              <div>
                <div className="text-xs font-medium text-[var(--text-muted)]">Applied</div>
                <div className="mt-0.5 text-sm text-white">
                  {format(new Date(app.applied_at), 'PP')}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-medium text-[var(--text-muted)]">Created</div>
              <div className="mt-0.5 text-sm text-white">
                {format(new Date(app.created_at), 'PP')}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--text-muted)]">Last updated</div>
              <div className="mt-0.5 text-sm text-white">
                {format(new Date(app.updated_at), 'PPp')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <EditApplicationModal
          app={app}
          companies={companies}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['applications'] })
            qc.invalidateQueries({ queryKey: ['activity', appId] })
            setEditOpen(false)
          }}
        />
      )}
    </>
  )
}

/* ── Interviews Section ──────────────────────────────────────────── */
function InterviewsSection({ interviews, onAdd, onOutcomeChange, onDelete }) {
  const [date,      setDate]      = useState('')
  const [roundName, setRoundName] = useState('')
  const [notes,     setNotes]     = useState('')
  const [outcome,   setOutcome]   = useState('pending')

  const handleAdd = (e) => {
    e.preventDefault()
    if (!date) return
    onAdd({
      scheduled_at: new Date(date).toISOString(),
      round_name: roundName || null,
      notes:      notes     || null,
      outcome,
    })
    setDate('')
    setRoundName('')
    setNotes('')
    setOutcome('pending')
  }

  const inputClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-3)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]'

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">Interviews</h2>

      {interviews.length === 0 && (
        <p className="mb-4 text-sm text-[var(--text-muted)]">No interviews scheduled yet.</p>
      )}

      <div className="space-y-3">
        {interviews.map((iv) => {
          const om = OUTCOME_META[iv.outcome] || OUTCOME_META.pending
          return (
            <div
              key={iv.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-3)] p-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                      <Calendar size={14} className="text-[var(--accent)]" />
                      {iv.scheduled_at ? format(new Date(iv.scheduled_at), 'PPp') : '—'}
                    </div>
                    {/* Outcome badge */}
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: `${om.color}22`, color: om.color }}
                    >
                      {om.label}
                    </span>
                  </div>
                  {iv.round_name && (
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{iv.round_name}</div>
                  )}
                  {iv.notes && (
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{iv.notes}</div>
                  )}
                </div>
                <button
                  onClick={() => onDelete(iv.id)}
                  className="shrink-0 rounded p-1 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Outcome selector */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">Outcome:</span>
                {OUTCOME_OPTIONS.map((o) => {
                  const m = OUTCOME_META[o]
                  const active = iv.outcome === o
                  return (
                    <button
                      key={o}
                      onClick={() => onOutcomeChange(iv.id, o)}
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium transition"
                      style={{
                        background: active ? m.color : `${m.color}22`,
                        color: active ? 'white' : m.color,
                      }}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add interview form */}
      <form onSubmit={handleAdd} className="mt-5 space-y-3 border-t border-[var(--border)] pt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="datetime-local"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Round (e.g. Phone screen)"
            value={roundName}
            onChange={(e) => setRoundName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className={inputClass}
          >
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o} value={o}>{OUTCOME_META[o].label}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
        >
          <Plus size={14} />
          Add interview
        </button>
      </form>
    </div>
  )
}

/* ── Activity Timeline ───────────────────────────────────────────── */
function ActivityTimeline({ events }) {
  if (!events.length) return null

  const typeIcon = (type) => {
    if (type === 'created')           return '🎯'
    if (type === 'status_changed')    return '🔄'
    if (type === 'interview_added')   return '📅'
    if (type === 'interview_outcome') return '✅'
    if (type === 'interview_deleted') return '🗑️'
    if (type === 'notes_updated')     return '📝'
    if (type === 'followup_updated')  return '🔔'
    if (type === 'resume_updated')    return '📄'
    return '•'
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-6">
      <div className="mb-4 flex items-center gap-2">
        <Activity size={16} className="text-[var(--accent)]" />
        <h2 className="text-lg font-semibold text-white">Activity</h2>
      </div>

      <ol className="relative border-l border-[var(--border)] space-y-4 pl-5">
        {events.map((ev) => (
          <li key={ev.id} className="relative">
            {/* dot */}
            <span className="absolute -left-[1.45rem] flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-3)] text-xs ring-2 ring-[var(--bg-2)]">
              {typeIcon(ev.event_type)}
            </span>
            <div>
              <p className="text-sm text-white">{ev.description}</p>
              <time className="text-xs text-[var(--text-muted)]">
                {format(new Date(ev.created_at), 'PPp')}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
