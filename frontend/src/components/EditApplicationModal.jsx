import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import { applicationsApi } from '../api'
import { STATUS_ORDER, STATUS_META } from '../constants'

function toLocalDatetimeValue(iso) {
  if (!iso) return ''
  // format as "YYYY-MM-DDTHH:mm" for datetime-local input
  try {
    return format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
  } catch {
    return ''
  }
}

export default function EditApplicationModal({ app, companies, onClose, onSaved }) {
  const [roleTitle,  setRoleTitle]  = useState(app.role_title  || '')
  const [companyId,  setCompanyId]  = useState(app.company_id  || '')
  const [status,     setStatus]     = useState(app.status      || 'wishlist')
  const [jobUrl,     setJobUrl]     = useState(app.job_url     || '')
  const [resumeUrl,  setResumeUrl]  = useState(app.resume_url  || '')
  const [notes,      setNotes]      = useState(app.notes       || '')
  const [appliedAt,  setAppliedAt]  = useState(toLocalDatetimeValue(app.applied_at))
  const [followUpAt, setFollowUpAt] = useState(toLocalDatetimeValue(app.follow_up_at))

  const update = useMutation({
    mutationFn: (data) => applicationsApi.update(app.id, data),
    onSuccess: () => {
      toast.success('Application updated')
      onSaved()
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    update.mutate({
      role_title:   roleTitle,
      company_id:   Number(companyId),
      status,
      job_url:      jobUrl     || null,
      resume_url:   resumeUrl  || null,
      notes:        notes      || null,
      applied_at:   appliedAt  ? new Date(appliedAt).toISOString()  : null,
      follow_up_at: followUpAt ? new Date(followUpAt).toISOString() : null,
    })
  }

  const inputClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-3)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Edit application</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-3)] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Role title
            </label>
            <input
              required
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Company */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Company
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className={inputClass}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputClass}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </div>

          {/* Job URL */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Job URL (optional)
            </label>
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          {/* Resume URL */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Resume / cover letter URL (optional)
            </label>
            <input
              type="url"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className={inputClass}
            />
          </div>

          {/* Applied at + Follow-up */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                Applied date (optional)
              </label>
              <input
                type="datetime-local"
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                Follow-up date (optional)
              </label>
              <input
                type="datetime-local"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Notes (optional)
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Recruiter name, compensation range, anything relevant…"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={update.isPending}
            className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
