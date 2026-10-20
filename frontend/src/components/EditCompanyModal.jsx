import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import { companiesApi } from '../api'

export default function EditCompanyModal({ company, onClose, onSaved }) {
  const [name,    setName]    = useState(company.name    || '')
  const [website, setWebsite] = useState(company.website || '')
  const [notes,   setNotes]   = useState(company.notes   || '')

  const update = useMutation({
    mutationFn: (data) => companiesApi.update(company.id, data),
    onSuccess: () => {
      toast.success('Company updated')
      onSaved()
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    update.mutate({
      name,
      website: website || null,
      notes:   notes   || null,
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
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Edit company</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-3)] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Website (optional)
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Notes (optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
