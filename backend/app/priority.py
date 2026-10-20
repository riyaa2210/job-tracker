"""
Priority Score engine — computes a 0–100 urgency/opportunity score for each
application so users can instantly see which ones need attention.

Scoring breakdown (total 100 pts):
  - Recency (30 pts)     : penalises stale applications — score decays after 7 days
  - Stage progress (25 pts): higher stages (interview, offer) score more
  - Follow-up overdue (25 pts): large boost if follow_up_at has passed
  - Interview momentum (20 pts): upcoming interviews boost score; past ones decay

A score ≥ 70 is "hot" (red), 40–69 is "warm" (amber), < 40 is "cool" (blue-grey).
Rejected applications always return 0.
"""

from datetime import datetime, timezone
from typing import Optional


# Status stage weights
_STAGE_SCORES = {
    "wishlist":  5,
    "applied":   12,
    "interview": 22,
    "offer":     25,
    "rejected":  0,
}


def compute_priority_score(
    status: str,
    updated_at: Optional[datetime],
    follow_up_at: Optional[datetime],
    interview_dates: list[datetime],
) -> float:
    """Return a float 0–100 priority score."""

    if status == "rejected":
        return 0.0

    now = datetime.now(timezone.utc)

    # ── 1. Stage progress (25 pts) ────────────────────────────────
    stage = _STAGE_SCORES.get(status, 0)

    # ── 2. Recency (30 pts) — decays linearly over 60 days ────────
    recency = 0.0
    if updated_at:
        # Ensure timezone-aware comparison
        ua = updated_at if updated_at.tzinfo else updated_at.replace(tzinfo=timezone.utc)
        days_since = max((now - ua).days, 0)
        recency = max(30.0 * (1 - days_since / 60.0), 0.0)

    # ── 3. Follow-up overdue (25 pts) ─────────────────────────────
    followup = 0.0
    if follow_up_at:
        fa = follow_up_at if follow_up_at.tzinfo else follow_up_at.replace(tzinfo=timezone.utc)
        if fa <= now:
            # Overdue — full 25 pts, increasing urgency
            days_overdue = (now - fa).days
            followup = min(25.0 + days_overdue * 2, 25.0)
        else:
            # Upcoming — small bonus to keep it visible
            days_until = (fa - now).days
            followup = max(10.0 - days_until, 0.0)

    # ── 4. Interview momentum (20 pts) ────────────────────────────
    interview_score = 0.0
    if interview_dates:
        upcoming = [
            d if d.tzinfo else d.replace(tzinfo=timezone.utc)
            for d in interview_dates
            if (d if d.tzinfo else d.replace(tzinfo=timezone.utc)) > now
        ]
        past = [
            d if d.tzinfo else d.replace(tzinfo=timezone.utc)
            for d in interview_dates
            if (d if d.tzinfo else d.replace(tzinfo=timezone.utc)) <= now
        ]

        if upcoming:
            # Nearest upcoming interview — boosts more the closer it is
            nearest = min((d - now).days for d in upcoming)
            interview_score = max(20.0 - nearest * 0.5, 10.0)
        elif past:
            # Only past interviews — moderate momentum indicator
            interview_score = min(len(past) * 5.0, 15.0)

    total = stage + recency + followup + interview_score
    return round(min(total, 100.0), 1)


def score_label(score: float) -> str:
    """Return a human-readable label for display."""
    if score >= 70:
        return "hot"
    if score >= 40:
        return "warm"
    return "cool"
