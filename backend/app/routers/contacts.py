"""
Contact CRUD — nested under companies, scoped to the current user.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models import Company, Contact, User
from app.schemas import ContactCreate, ContactUpdate, ContactOut

router = APIRouter()


def _get_owned_company(db: Session, company_id: int, user: User) -> Company:
    company = db.get(Company, company_id)
    if not company or company.user_id != user.id:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


def _get_owned_contact(db: Session, contact_id: int, user: User) -> Contact:
    contact = db.get(Contact, contact_id)
    if not contact or contact.company.user_id != user.id:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.get("/companies/{company_id}/contacts", response_model=list[ContactOut])
def list_contacts(
    company_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_owned_company(db, company_id, user)
    return (
        db.query(Contact)
        .filter(Contact.company_id == company_id)
        .order_by(Contact.created_at)
        .all()
    )


@router.post(
    "/companies/{company_id}/contacts",
    response_model=ContactOut,
    status_code=status.HTTP_201_CREATED,
)
def create_contact(
    company_id: int,
    payload: ContactCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_owned_company(db, company_id, user)
    contact = Contact(company_id=company_id, **payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.patch("/contacts/{contact_id}", response_model=ContactOut)
def update_contact(
    contact_id: int,
    payload: ContactUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    contact = _get_owned_contact(db, contact_id, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    contact = _get_owned_contact(db, contact_id, user)
    db.delete(contact)
    db.commit()
