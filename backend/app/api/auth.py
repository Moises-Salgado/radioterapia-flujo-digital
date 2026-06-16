from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.entities import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.users import UserRead, UserSelfUpdate
from app.services.workflow import get_processable_stages

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == payload.username))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario o contraseña incorrectos")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")
    token = create_access_token(subject=user.id, extra={"role": user.role})
    return TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    user_read = UserRead.model_validate(current_user)
    return user_read.model_copy(update={"processable_stages": get_processable_stages(current_user.role)})


@router.patch("/me", response_model=UserRead)
def update_me(
    payload: UserSelfUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    username_owner = db.scalar(select(User).where(User.username == payload.username, User.id != current_user.id))
    if username_owner:
        raise HTTPException(status_code=409, detail="El username ya está en uso")

    current_user.full_name = payload.full_name
    current_user.username = payload.username
    if payload.password:
        current_user.password_hash = get_password_hash(payload.password)

    db.commit()
    db.refresh(current_user)
    user_read = UserRead.model_validate(current_user)
    return user_read.model_copy(update={"processable_stages": get_processable_stages(current_user.role)})
