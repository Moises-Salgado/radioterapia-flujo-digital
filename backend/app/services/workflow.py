from sqlalchemy.orm import Session

from app.models.entities import Purpose, Role, Stage
from app.services.roles import get_role_stages

ROLE_BY_STAGE: dict[str, set[str]] = {
    Stage.INGRESO: {"Médico"},
    Stage.SIMULACION: {Role.TECNOLOGO},
    Stage.DOSIMETRIA: {Role.FISICO, Role.TECNOLOGO},
    Stage.FISICA_MEDICA: {Role.FISICO},
    Stage.IMPRESION: {Role.TECNOLOGO},
    Stage.ENFERMERIA: {Role.ENFERMERO},
    Stage.CITACION: {Role.TECNOLOGO},
    Stage.INICIO_TERMINO: {"Tens", "TENS"},
}

PURPOSES_BY_STAGE: dict[str, list[str]] = {
    Stage.INGRESO: [Purpose.SIMULACION],
    Stage.SIMULACION: [Purpose.DOSIMETRIA],
    Stage.DOSIMETRIA: [Purpose.FISICA_MEDICA],
    Stage.FISICA_MEDICA: [
        Purpose.MEDICION,
        Purpose.PLANIFICACION,
        Purpose.REPLANIFICACION,
        Purpose.CALCULAR_DOSIS,
    ],
    Stage.IMPRESION: [Purpose.IMPRIMIR, Purpose.DEVOLVER_FISICA_MEDICA],
    Stage.ENFERMERIA: [Purpose.RECEPCION],
    Stage.CITACION: [Purpose.CITAR, Purpose.FALLECIDO_NO_DISPONIBLE],
    Stage.INICIO_TERMINO: [Purpose.INICIAR_TERMINAR_TRATAMIENTO, Purpose.FALLECIDO_NO_DISPONIBLE],
}


def can_process_stage(role: str, stage: str, db: Session | None = None) -> bool:
    if role == Role.ADMIN:
        return stage in Stage.ORDER
    if db is not None:
        return stage in get_role_stages(db, role)
    return role in ROLE_BY_STAGE.get(stage, set())


def get_stage_purposes(stage: str) -> list[str]:
    return PURPOSES_BY_STAGE.get(stage, [])


def is_valid_purpose_for_stage(stage: str, purpose: str) -> bool:
    return purpose in get_stage_purposes(stage)


def get_processable_stages(role: str, db: Session | None = None) -> list[str]:
    """Get all stages a role can process, in priority order."""
    if role == Role.ADMIN:
        return Stage.ORDER
    if db is not None:
        return get_role_stages(db, role)
    stages = [stage for stage in Stage.ORDER if can_process_stage(role, stage)]
    return stages


def get_primary_stage(role: str, db: Session | None = None) -> str | None:
    """Get the first (priority) stage a role can process."""
    stages = get_processable_stages(role, db)
    return stages[0] if stages else None


def get_next_stage(stage: str, purpose: str | None = None) -> str:
    if stage == Stage.FINALIZADO:
        return Stage.FINALIZADO
    if purpose == Purpose.FALLECIDO_NO_DISPONIBLE:
        return Stage.FINALIZADO
    if stage == Stage.IMPRESION and purpose == Purpose.DEVOLVER_FISICA_MEDICA:
        return Stage.FISICA_MEDICA
    try:
        index = Stage.ORDER.index(stage)
    except ValueError:
        raise ValueError("Etapa actual inválida")
    if index == len(Stage.ORDER) - 1:
        return Stage.FINALIZADO
    return Stage.ORDER[index + 1]
