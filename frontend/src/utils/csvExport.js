/**
 * Exports the applications array to a CSV file and triggers a browser download.
 */
export function exportToCsv(apps) {
  const headers = [
    'ID',
    'Role Title',
    'Company',
    'Status',
    'Applied At',
    'Follow-up At',
    'Job URL',
    'Resume URL',
    'Notes',
    'Priority Score',
    'Created At',
    'Updated At',
  ]

  const rows = apps.map((a) => [
    a.id,
    csvCell(a.role_title),
    csvCell(a.company?.name),
    a.status,
    a.applied_at   ? new Date(a.applied_at).toLocaleDateString()   : '',
    a.follow_up_at ? new Date(a.follow_up_at).toLocaleDateString() : '',
    csvCell(a.job_url),
    csvCell(a.resume_url),
    csvCell(a.notes),
    a.priority_score ?? '',
    a.created_at ? new Date(a.created_at).toLocaleString() : '',
    a.updated_at ? new Date(a.updated_at).toLocaleString() : '',
  ])

  const csv = [headers, ...rows]
    .map((row) => row.join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Wrap a cell value in quotes and escape inner quotes. */
function csvCell(val) {
  if (val == null || val === '') return ''
  const str = String(val).replace(/"/g, '""')
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str}"`
    : str
}
