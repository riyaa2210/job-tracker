export const STATUS_META = {
  wishlist:  { label: 'Wishlist',  color: '#8b5cf6' },
  applied:   { label: 'Applied',   color: '#3b82f6' },
  interview: { label: 'Interview', color: '#f59e0b' },
  offer:     { label: 'Offer',     color: '#10b981' },
  rejected:  { label: 'Rejected',  color: '#ef4444' },
}

export const STATUS_ORDER = ['wishlist', 'applied', 'interview', 'offer', 'rejected']

export const OUTCOME_META = {
  pending: { label: 'Pending',  color: '#f59e0b' },
  passed:  { label: 'Passed',   color: '#10b981' },
  failed:  { label: 'Failed',   color: '#ef4444' },
}

export const OUTCOME_OPTIONS = ['pending', 'passed', 'failed']

/** Priority score → heat level */
export function scoreMeta(score) {
  if (score == null) return { label: '—',    color: '#4b5563', bg: '#4b556322' }
  if (score >= 70)   return { label: 'Hot',  color: '#ef4444', bg: '#ef444422' }
  if (score >= 40)   return { label: 'Warm', color: '#f59e0b', bg: '#f59e0b22' }
  return               { label: 'Cool', color: '#6366f1', bg: '#6366f122' }
}

/** Activity event type → icon label */
export const EVENT_LABELS = {
  created:           'Created',
  status_changed:    'Status changed',
  notes_updated:     'Notes updated',
  followup_updated:  'Follow-up updated',
  resume_updated:    'Resume updated',
  interview_added:   'Interview scheduled',
  interview_outcome: 'Interview outcome',
  interview_deleted: 'Interview removed',
}
