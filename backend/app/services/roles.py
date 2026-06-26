from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Role, RoleDefinition, Stage


DEFAULT_ROLE_STAGES: dict[str, list[str]] = {
    Role.ADMIN: Stage.ORDER,
    Role.FISICO: [Stage.DOSIMETRIA, Stage.FISICA_MEDICA],
    Role.TECNOLOGO: [Stage.SIMULACION, Stage.DOSIMETRIA, Stage.IMPRESION, Stage.CITACION],
    Role.ENFERMERO: [Stage.ENFERMERIA],
}


def serialize_stages(stages: list[str]) -> str:
    return "|".join(stage for stage in Stage.ORDER if stage in stages)


def parse_stages(value: str | None) -> list[str]:
    if not value:
        return []
    selected = {stage for stage in value.split("|") if stage in Stage.ORDER}
    return [stage for stage in Stage.ORDER if stage in selected]


def seed_role_definitions(db: Session) -> None:
    for role_name, stages in DEFAULT_ROLE_STAGES.items():
        role = db.scalar(select(RoleDefinition).where(RoleDefinition.name == role_name))
        if role:
            role.is_system = True
            role.processable_stages = serialize_stages(stages)
            continue
        db.add(
            RoleDefinition(
                name=role_name,
                processable_stages=serialize_stages(stages),
                is_system=True,
            )
        )
    db.commit()


def role_exists(db: Session, role_name: str) -> bool:
    return db.scalar(select(RoleDefinition.id).where(RoleDefinition.name == role_name)) is not None


def get_role_stages(db: Session | None, role_name: str) -> list[str]:
    if role_name == Role.ADMIN:
        return Stage.ORDER
    if db is not None:
        role = db.scalar(select(RoleDefinition).where(RoleDefinition.name == role_name))
        if role:
            return parse_stages(role.processable_stages)
    return DEFAULT_ROLE_STAGES.get(role_name, [])
