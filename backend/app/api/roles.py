from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.entities import Role, RoleDefinition, Stage, User
from app.schemas.roles import RoleDefinitionCreate, RoleDefinitionRead
from app.services.roles import parse_stages, serialize_stages

router = APIRouter(prefix="/roles", tags=["Roles"])


def role_to_read(role: RoleDefinition) -> RoleDefinitionRead:
    return RoleDefinitionRead(
        id=role.id,
        name=role.name,
        processable_stages=parse_stages(role.processable_stages),
        is_system=role.is_system,
        created_at=role.created_at,
    )


@router.get("", response_model=list[RoleDefinitionRead])
def list_roles(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    roles = db.scalars(select(RoleDefinition).order_by(RoleDefinition.is_system.desc(), RoleDefinition.name.asc())).all()
    return [role_to_read(role) for role in roles]


@router.post("", response_model=RoleDefinitionRead, status_code=status.HTTP_201_CREATED)
def create_role(payload: RoleDefinitionCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    if payload.name == Role.ADMIN:
        raise HTTPException(status_code=400, detail="El rol Admin ya existe y no se puede duplicar")
    exists = db.scalar(select(RoleDefinition).where(RoleDefinition.name == payload.name))
    if exists:
        raise HTTPException(status_code=409, detail="Ya existe un rol con ese nombre")
    if not payload.processable_stages:
        raise HTTPException(status_code=422, detail="Selecciona al menos una etapa para el rol")
    invalid = [stage for stage in payload.processable_stages if stage not in Stage.ORDER]
    if invalid:
        raise HTTPException(status_code=422, detail=f"Etapas invalidas: {', '.join(invalid)}")
    role = RoleDefinition(
        name=payload.name,
        processable_stages=serialize_stages(payload.processable_stages),
        is_system=False,
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role_to_read(role)
