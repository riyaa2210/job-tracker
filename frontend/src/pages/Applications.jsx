import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { Plus, Search, X, Download, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'

import { applicationsApi, companiesApi } from '../api'
import { STATUS_ORDER, STATUS_META } from '../constants'
import { exportToCsv } from '../utils/csvExport'
import KanbanColumn from '../components/KanbanColumn'
import ApplicationCard from '../components/ApplicationCard'
import NewApplicationModal from '../components/NewApplicationModal'

export default function Applications() {
  const qc = useQueryClient()
  const [activeApp,   setActiveApp]   = useState(null)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // ── filter state ──────────────────────────────────────────────
  const [search,      setSearch]      = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterStatus,  setFilterStatus]  = useState('')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.list(),
  })
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => applicationsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
    onError: () => toast.error('Failed to update'),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // ── filtering logic ───────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return apps.filter((a) => {
      if (q) {
        const inTitle   = a.role_title?.toLowerCase().includes(q)
        const inCompany = a.company?.name?.toLowerCase().includes(q)
        if (!inTitle && !inCompany) return false
      }
      if (filterCompany && String(a.company_id) !== filterCompany) return false
      if (filterStatus  && a.status !== filterStatus) return false
      if (dateFrom) {
        const from = new Date(dateFrom)
        if (new Date(a.created_at) < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(a.created_at) > to) return false
      }
      return true
    })
  }, [apps, search, filterCompany, filterStatus, dateFrom, dateTo])

  const grouped = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = filtered.filter((a) => a.status === status)
    return acc
  }, {})

  const hasFilters = search || filterCompany || filterStatus || dateFrom || dateTo
  const clearFilters = () => {
    setSearch('')
    setFilterCompany('')
    setFilterStatus('')
    setDateFrom('')
    setDateTo('')
  }

  const handleDragStart = (e) => {
    setActiveApp(apps.find((a) => a.id === e.active.id))
  }

  const handleDragEnd = (e) => {
    setActiveApp(null)
    const { active, over } = e
    if (!over) return

    let targetStatus = over.id
    if (!STATUS_ORDER.includes(targetStatus)) {
      const overApp = apps.find((a) => a.id === over.id)
      if (!overApp) return
      targetStatus = overApp.status
    }

    const currentApp = apps.find((a) => a.id === active.id)
    if (!currentApp || currentApp.status === targetStatus) return

    updateStatus.mutate({ id: currentApp.id, status: targetStatus })
  }

  const inputClass =
    'rounded-lg border border-[var(--border)] bg-[var(--bg-3)] px-3 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]'

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Applications</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Drag cards between columns to update status
            {hasFilters && (
              <span className="ml-2 text-[var(--accent)]">
                · {filtered.length} of {apps.length} shown
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCsv(filtered)}
            title="Export visible applications to CSV"
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-2)] px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-white"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              showFilters || hasFilters
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-white'
            }`}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Filters</span>
            {hasFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-bold text-white">
                !
              </span>
            )}
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New application</span>
          </button>
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────── */}
      {showFilters && (
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="relative min-w-[180px] flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                placeholder="Search role or company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputClass} w-full pl-8`}
              />
            </div>

            {/* Company filter */}
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className={inputClass}
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={inputClass}
            >
              <option value="">All statuses</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={inputClass}
                title="Applied from"
              />
              <span className="text-xs text-[var(--text-muted)]">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={inputClass}
                title="Applied to"
              />
            </div>

            {/* Clear */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-white"
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Board ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="text-[var(--text-muted)]">Loading…</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {STATUS_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                apps={grouped[status] || []}
              />
            ))}
          </div>

          <DragOverlay>
            {activeApp ? <ApplicationCard app={activeApp} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── New application modal ──────────────────────────────── */}
      {modalOpen && (
        <NewApplicationModal
          companies={companies}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['applications'] })
            setModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
