"""
Application CRUD + status filtering + enriched list.
Activity events are logged on create/update.
Priority score is computed and injected into every response.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.deps import get_db, get_current_user
from app.models import Application, Company, User, ApplicationStatus, ActivityEvent, Interview
from app.schemas import (
    ApplicationCreate, ApplicationUpdate,
    ApplicationOut, ApplicationWithCompany,
)
from app.priority import compute_priority_score

router = APIRouter()


# ─── helpers ─────────────────────────────────────────────────────

def _get_owned(db: Session, app_id: int, user: User) -> Application:
    app = db.get(Application, app_id)
    if not app or app.user_id != user.id:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


def _log_event(db: Session, application_id: int, event_type: str, description: str):
    event = ActivityEvent(
        application_id=application_id,
        event_type=event_type,
        description=description,
    )
    db.add(event)
    # Caller is responsible for commit


def _inject_score(app: Application, db: Session) -> Application:
    """Compute and attach priority_score to the ORM object before serialising."""
    interview_dates = [
        iv.scheduled_at
        for iv in db.query(Interview)
        .filter(Interview.application_id == app.id)
        .all()
    ]
    app.priority_score = compute_priority_score(
        status=app.status.value,
        updated_at=app.updated_at,
        follow_up_at=app.follow_up_at,
        interview_dates=interview_dates,
    )
    return app


# ─── endpoints ───────────────────────────────────────────────────

@router.get("", response_model=list[ApplicationWithCompany])
def list_applications(
    status_filter: Optional[ApplicationStatus] = Query(None, alias="status"),
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = (
        db.query(Application)
        .options(joinedload(Application.company))
        .filter(Application.user_id == user.id)
    )
    if status_filter:
        q = q.filter(Application.status == status_filter)
    if company_id:
        q = q.filter(Application.company_id == company_id)

    apps = q.order_by(Application.updated_at.desc()).all()
    for app in apps:
        _inject_score(app, db)
    return apps


@router.post("", response_model=ApplicationWithCompany, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    company = db.get(Company, payload.company_id)
    if not company or company.user_id != user.id:
        raise HTTPException(status_code=400, detail="Invalid company_id")

    app = Application(user_id=user.id, **payload.model_dump())
    db.add(app)
    db.flush()  # get app.id before logging

    _log_event(
        db, app.id, "created",
        f'Application created for "{app.role_title}" at {company.name} '
        f'with status "{app.status.value}"',
    )
    db.commit()
    db.refresh(app)
    _inject_score(app, db)
    return app


@router.get("/{app_id}", response_model=ApplicationWithCompany)
def get_application(
    app_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app = _get_owned(db, app_id, user)
    _inject_score(app, db)
    return app


@router.patch("/{app_id}", response_model=ApplicationWithCompany)
def update_application(
    app_id: int,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app = _get_owned(db, app_id, user)

    updates = payload.model_dump(exclude_unset=True)

    if "company_id" in updates:
        company = db.get(Company, updates["company_id"])
        if not company or company.user_id != user.id:
            raise HTTPException(status_code=400, detail="Invalid company_id")

    # Log meaningful changes as activity events
    if "status" in updates and updates["status"] != app.status:
        old_status = app.status.value
        new_status = updates["status"].value if hasattr(updates["status"], "value") else updates["status"]
        _log_event(
            db, app.id, "status_changed",
            f'Status changed from "{old_status}" to "{new_status}"',
        )

    if "notes" in updates and updates["notes"] != app.notes:
        _log_event(db, app.id, "notes_updated", "Notes were updated")

    if "follow_up_at" in updates and updates["follow_up_at"] != app.follow_up_at:
        val = updates["follow_up_at"]
        desc = f'Follow-up date set to {val.strftime("%Y-%m-%d")}' if val else "Follow-up date cleared"
        _log_event(db, app.id, "followup_updated", desc)

    if "resume_url" in updates and updates["resume_url"] != app.resume_url:
        _log_event(db, app.id, "resume_updated", "Resume link updated")

    for field, value in updates.items():
        setattr(app, field, value)

    db.commit()
    db.refresh(app)
    _inject_score(app, db)
    return app


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    app_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app = _get_owned(db, app_id, user)
    db.delete(app)
    db.commit()
