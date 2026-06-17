from app.models.entities import Purpose, Role, Stage

ROLE_BY_STAGE: dict[str, set[str]] = {
    Stage.DOSIMETRIA: {Role.FISICO, Role.TECNOLOGO},
    Stage.FISICA_MEDICA: {Role.FISICO},
    Stage.IMPRESION: {Role.TECNOLOGO},
    Stage.ENFERMERIA: {Role.ENFERMERO},
    Stage.CITACION: {Role.TECNOLOGO},
}

PURPOSES_BY_STAGE: dict[str, list[str]] = {
    Stage.DOSIMETRIA: [Purpose.MEDICION, Purpose.FISICA_MEDICA],
    Stage.FISICA_MEDICA: [
        Purpose.MEDICION,
        Purpose.PLANIFICACION,
        Purpose.REPLANIFICACION,
        Purpose.CALCULAR_DOSIS,
    ],
    Stage.IMPRESION: [Purpose.IMPRIMIR, Purpose.DEVOLVER_FISICA_MEDICA],
    Stage.ENFERMERIA: [Purpose.RECEPCION],
    Stage.CITACION: [Purpose.RECEPCION],
}


def can_process_stage(role: str, stage: str) -> bool:
    if role == Role.ADMIN:
        return stage in Stage.ORDER
    return role in ROLE_BY_STAGE.get(stage, set())


def get_stage_purposes(stage: str) -> list[str]:
    return PURPOSES_BY_STAGE.get(stage, [])


def is_valid_purpose_for_stage(stage: str, purpose: str) -> bool:
    return purpose in get_stage_purposes(stage)


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


def get_next_stage(stage: str, purpose: str | None = None) -> str:
    if stage == Stage.FINALIZADO:
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
