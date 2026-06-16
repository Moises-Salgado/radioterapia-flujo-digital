from app.models.entities import Role, Stage

ROLE_BY_STAGE: dict[str, set[str]] = {
    Stage.DOSIMETRIA: {Role.FISICO, Role.TECNOLOGO},
    Stage.FISICA_MEDICA: {Role.FISICO},
    Stage.IMPRESION: {Role.TECNOLOGO},
    Stage.ENFERMERIA: {Role.ENFERMERO},
    Stage.CITACION: {Role.TECNOLOGO},
}


def can_process_stage(role: str, stage: str) -> bool:
    if role == Role.ADMIN:
        return stage in Stage.ORDER
    return role in ROLE_BY_STAGE.get(stage, set())


def get_processable_stages(role: str) -> list[str]:
    """Get all stages a role can process, in priority order."""
    if role == Role.ADMIN:
        return Stage.ORDER
    stages = [stage for stage in Stage.ORDER if can_process_stage(role, stage)]
    return stages


def get_primary_stage(role: str) -> str | None:
    """Get the first (priority) stage a role can process."""
    stages = get_processable_stages(role)
    return stages[0] if stages else None


def get_next_stage(stage: str) -> str:
    if stage == Stage.FINALIZADO:
        return Stage.FINALIZADO
    try:
        index = Stage.ORDER.index(stage)
    except ValueError:
        raise ValueError("Etapa actual inválida")
    if index == len(Stage.ORDER) - 1:
        return Stage.FINALIZADO
    return Stage.ORDER[index + 1]
