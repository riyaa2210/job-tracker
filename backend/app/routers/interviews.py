"""
Interview endpoints — nested under /applications/{id}/interviews.
Activity events are logged when interviews are created/deleted.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models import Application, Interview, User, ActivityEvent
from app.schemas import InterviewCreate, InterviewUpdate, InterviewOut

router = APIRouter()


def _get_owned_app(db: Session, app_id: int, user: User) -> Application:
    app = db.get(Application, app_id)
    if not app or app.user_id != user.id:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


def _get_owned_interview(db: Session, interview_id: int, user: User) -> Interview:
    interview = db.get(Interview, interview_id)
    if not interview or interview.application.user_id != user.id:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


def _log_event(db: Session, application_id: int, event_type: str, description: str):
    db.add(ActivityEvent(
        application_id=application_id,
        event_type=event_type,
        description=description,
    ))


@router.get("/applications/{app_id}/interviews", response_model=list[InterviewOut])
def list_interviews(
    app_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_owned_app(db, app_id, user)
    return (
        db.query(Interview)
        .filter(Interview.application_id == app_id)
        .order_by(Interview.scheduled_at)
        .all()
    )


@router.post(
    "/applications/{app_id}/interviews",
    response_model=InterviewOut,
    status_code=status.HTTP_201_CREATED,
)
def create_interview(
    app_id: int,
    payload: InterviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_owned_app(db, app_id, user)
    interview = Interview(application_id=app_id, **payload.model_dump())
    db.add(interview)
    db.flush()

    round_label = payload.round_name or "Interview"
    date_label = payload.scheduled_at.strftime("%Y-%m-%d %H:%M")
    _log_event(
        db, app_id, "interview_added",
        f'{round_label} scheduled for {date_label}',
    )

    db.commit()
    db.refresh(interview)
    return interview


@router.patch("/interviews/{interview_id}", response_model=InterviewOut)
def update_interview(
    interview_id: int,
    payload: InterviewUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    interview = _get_owned_interview(db, interview_id, user)

    updates = payload.model_dump(exclude_unset=True)

    if "outcome" in updates and updates["outcome"] != interview.outcome:
        outcome = updates["outcome"]
        _log_event(
            db, interview.application_id, "interview_outcome",
            f'Interview "{interview.round_name or "round"}" outcome set to "{outcome}"',
        )

    for field, value in updates.items():
        setattr(interview, field, value)

    db.commit()
    db.refresh(interview)
    return interview


@router.delete("/interviews/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    interview = _get_owned_interview(db, interview_id, user)
    _log_event(
        db, interview.application_id, "interview_deleted",
        f'Interview "{interview.round_name or "round"}" was removed',
    )
    db.delete(interview)
    db.commit()
