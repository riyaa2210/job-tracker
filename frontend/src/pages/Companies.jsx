import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, ExternalLink, X, Pencil,
  UserPlus, Mail, ChevronDown, ChevronUp, User,
} from 'lucide-react'
import { companiesApi, contactsApi } from '../api'
import EditCompanyModal from '../components/EditCompanyModal'

export default function Companies() {
  const qc = useQueryClient()
  const [newModalOpen,  setNewModalOpen]  = useState(false)
  const [editCompany,   setEditCompany]   = useState(null)   // company object to edit
  const [expandedId,    setExpandedId]    = useState(null)   // expanded contacts panel

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  })

  const deleteCompany = useMutation({
    mutationFn: (id) => companiesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Company deleted')
    },
  })

  const toggleExpand = (id) =>
    setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Companies</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Companies you're tracking
          </p>
        </div>
        <button
          onClick={() => setNewModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
        >
          <Plus size={16} />
          New company
        </button>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="text-[var(--text-muted)]">Loading…</div>
      ) : companies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center text-sm text-[var(--text-muted)]">
          No companies yet. Add one to start tracking applications.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <CompanyCard
              key={c.id}
              company={c}
              expanded={expandedId === c.id}
              onToggleExpand={() => toggleExpand(c.id)}
              onEdit={() => setEditCompany(c)}
              onDelete={() => {
                if (confirm(`Delete ${c.name}? This also removes all its applications.`))
                  deleteCompany.mutate(c.id)
              }}
            />
          ))}
        </div>
      )}

      {/* ── New company modal ──────────────────────────────────── */}
      {newModalOpen && (
        <NewCompanyModal
          onClose={() => setNewModalOpen(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['companies'] })
            setNewModalOpen(false)
          }}
        />
      )}

      {/* ── Edit company modal ─────────────────────────────────── */}
      {editCompany && (
        <EditCompanyModal
          company={editCompany}
          onClose={() => setEditCompany(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['companies'] })
            setEditCompany(null)
          }}
        />
      )}
    </div>
  )
}

/* ── Company card ────────────────────────────────────────────────── */
function CompanyCard({ company: c, expanded, onToggleExpand, onEdit, onDelete }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] transition hover:border-[var(--accent)]">
      {/* Card header */}
      <div className="group p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white">{c.name}</h3>
          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={onEdit}
              className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-3)] hover:text-white"
              title="Edit company"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={onDelete}
              className="rounded p-1 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"
              title="Delete company"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {c.website && (
          <a
            href={c.website}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
          >
            <ExternalLink size={11} />
            {(() => { try { return new URL(c.website).hostname } catch { return c.website } })()}
          </a>
        )}

        {c.notes && (
          <p className="mt-3 line-clamp-2 text-sm text-[var(--text-muted)]">
            {c.notes}
          </p>
        )}
      </div>

      {/* Contacts toggle */}
      <button
        onClick={onToggleExpand}
        className="flex w-full items-center justify-between border-t border-[var(--border)] px-5 py-2.5 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--bg-3)] hover:text-white"
      >
        <span className="flex items-center gap-1.5">
          <User size={12} />
          Contacts
        </span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {/* Contacts panel */}
      {expanded && <ContactsPanel companyId={c.id} />}
    </div>
  )
}

/* ── Contacts panel ──────────────────────────────────────────────── */
function ContactsPanel({ companyId }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', companyId],
    queryFn: () => contactsApi.list(companyId),
  })

  const deleteContact = useMutation({
    mutationFn: (id) => contactsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts', companyId] })
      toast.success('Contact removed')
    },
  })

  return (
    <div className="border-t border-[var(--border)] px-5 pb-4 pt-3">
      {isLoading ? (
        <div className="py-2 text-xs text-[var(--text-muted)]">Loading…</div>
      ) : contacts.length === 0 && !showForm ? (
        <p className="py-1 text-xs text-[var(--text-muted)]">No contacts yet.</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((ct) => (
            <div
              key={ct.id}
              className="group flex items-start justify-between gap-3 rounded-lg bg-[var(--bg-3)] px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">{ct.name}</div>
                {ct.role && (
                  <div className="text-xs text-[var(--text-muted)]">{ct.role}</div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  {ct.email && (
                    <a
                      href={`mailto:${ct.email}`}
                      className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                    >
                      <Mail size={11} />
                      {ct.email}
                    </a>
                  )}
                  {ct.linkedin_url && (
                    <a
                      href={ct.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.8 0 0 .77 0 1.73v20.54C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/>
                      </svg>
                      LinkedIn
                    </a>
                  )}
                </div>
                {ct.notes && (
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{ct.notes}</div>
                )}
              </div>
              <button
                onClick={() => deleteContact.mutate(ct.id)}
                className="mt-0.5 shrink-0 rounded p-1 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <AddContactForm
          companyId={companyId}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['contacts', companyId] })
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline"
        >
          <UserPlus size={12} />
          Add contact
        </button>
      )}
    </div>
  )
}

/* ── Add contact inline form ─────────────────────────────────────── */
function AddContactForm({ companyId, onDone, onCancel }) {
  const [name,        setName]        = useState('')
  const [role,        setRole]        = useState('')
  const [email,       setEmail]       = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [notes,       setNotes]       = useState('')

  const create = useMutation({
    mutationFn: (data) => contactsApi.create(companyId, data),
    onSuccess: () => {
      toast.success('Contact added')
      onDone()
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    create.mutate({
      name,
      role:         role         || null,
      email:        email        || null,
      linkedin_url: linkedinUrl  || null,
      notes:        notes        || null,
    })
  }

  const inputClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]'

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-3)] p-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          required
          placeholder="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          placeholder="Role / title"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          type="url"
          placeholder="LinkedIn URL"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          className={inputClass}
        />
      </div>
      <input
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className={inputClass}
      />
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {create.isPending ? 'Saving…' : 'Save contact'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[var(--text-muted)] hover:text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ── New company modal ───────────────────────────────────────────── */
function NewCompanyModal({ onClose, onCreated }) {
  const [name,    setName]    = useState('')
  const [website, setWebsite] = useState('')
  const [notes,   setNotes]   = useState('')

  const create = useMutation({
    mutationFn: companiesApi.create,
    onSuccess: () => {
      toast.success('Company added')
      onCreated()
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    create.mutate({ name, website: website || null, notes: notes || null })
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
          <h2 className="text-lg font-semibold text-white">New company</h2>
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
              placeholder="Google"
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
              placeholder="https://google.com"
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
            disabled={create.isPending}
            className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create company'}
          </button>
        </form>
      </div>
    </div>
  )
}
