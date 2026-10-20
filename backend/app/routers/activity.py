"""
Activity event log — read-only from the API; events are written internally
by the applications/interviews routers whenever something changes.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models import Application, ActivityEvent, User
from app.schemas import ActivityEventOut

router = APIRouter()


@router.get("/applications/{app_id}/activity", response_model=list[ActivityEventOut])
def list_activity(
    app_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app = db.get(Application, app_id)
    if not app or app.user_id != user.id:
        raise HTTPException(status_code=404, detail="Application not found")

    return (
        db.query(ActivityEvent)
        .filter(ActivityEvent.application_id == app_id)
        .order_by(ActivityEvent.created_at.desc())
        .all()
    )
