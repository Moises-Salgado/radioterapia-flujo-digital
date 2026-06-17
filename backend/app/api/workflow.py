from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_admin
from app.api.patients import patient_to_read
from app.core.database import get_db
from app.models.entities import Patient, Stage, User, WorkflowLog
from app.schemas.patients import PatientRead
from app.schemas.workflow import (
    CompletedPatientItem,
    ProcessStageRequest,
    ProcessStageResponse,
    StageSummaryItem,
    StageSummaryResponse,
)
from app.services.workflow import can_process_stage, get_next_stage, is_valid_purpose_for_stage

router = APIRouter(prefix="/workflow", tags=["Flujo de Radioterapia"])


@router.get("/summary", response_model=StageSummaryResponse)
def get_stage_summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    counts = dict(
        db.execute(select(Patient.current_stage, func.count(Patient.id)).group_by(Patient.current_stage)).all()
    )
    return StageSummaryResponse(stages=[StageSummaryItem(stage=stage, count=counts.get(stage, 0)) for stage in Stage.ALL])


@router.post("/patients/{patient_id}/process", response_model=ProcessStageResponse)
def process_patient_stage(
    patient_id: int,
    payload: ProcessStageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    if patient.current_stage == Stage.FINALIZADO:
        raise HTTPException(status_code=400, detail="El paciente ya está finalizado")

    stage_to_process = patient.current_stage
    if not can_process_stage(current_user.role, stage_to_process):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"El rol {current_user.role} no puede procesar la etapa {stage_to_process}",
        )
    if not is_valid_purpose_for_stage(stage_to_process, payload.purpose):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"La opción {payload.purpose} no corresponde a la etapa {stage_to_process}",
        )

    log = WorkflowLog(
        patient_id=patient.id,
        processed_stage=stage_to_process,
        user_id=current_user.id,
        purpose=payload.purpose,
        notes=payload.notes,
    )
    patient.current_stage = get_next_stage(stage_to_process, payload.purpose)
    db.add(log)
    db.commit()
    db.refresh(patient)
    db.refresh(log)

    log_with_user = db.scalar(
        select(WorkflowLog).options(joinedload(WorkflowLog.user)).where(WorkflowLog.id == log.id)
    )
    return ProcessStageResponse(patient=patient_to_read(db, patient), log=log_with_user)


@router.get("/completed", response_model=list[CompletedPatientItem])
def get_completed_patients(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    completed_patients = db.scalars(
        select(Patient)
        .where(Patient.current_stage == Stage.FINALIZADO)
        .order_by(Patient.created_at.desc())
    ).all()

    results: list[CompletedPatientItem] = []
    for patient in completed_patients:
        latest_log = db.scalar(
            select(WorkflowLog)
            .where(WorkflowLog.patient_id == patient.id)
            .order_by(WorkflowLog.fecha_hora.desc())
            .limit(1)
        )
        finished_at = latest_log.fecha_hora if latest_log else patient.created_at
        results.append(CompletedPatientItem(patient=patient_to_read(db, patient), finished_at=finished_at))
    return results


@router.post("/patients/{patient_id}/reopen", response_model=PatientRead)
def reopen_completed_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    if patient.current_stage != Stage.FINALIZADO:
        raise HTTPException(status_code=400, detail="Solo se pueden reabrir pacientes finalizados")

    patient.current_stage = Stage.CITACION
    db.commit()
    db.refresh(patient)
    return patient_to_read(db, patient)
