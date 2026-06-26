import re

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.models.entities import Patient, Stage, User, WorkflowLog
from app.schemas.patients import PatientCreate, PatientFichaCreate, PatientPriorityUpdate, PatientRead, UploadPatientsResponse, WorkflowLogRead
from app.services.patient_importer import import_patients_from_text
from app.services.workflow import get_processable_stages

router = APIRouter(prefix="/patients", tags=["Pacientes"])


def _normalize_search_text_expression(expr):
    normalized = func.lower(expr)
    for source, replacement in [
        ('á', 'a'), ('Á', 'a'),
        ('é', 'e'), ('É', 'e'),
        ('í', 'i'), ('Í', 'i'),
        ('ó', 'o'), ('Ó', 'o'),
        ('ú', 'u'), ('Ú', 'u'),
        ('ü', 'u'), ('Ü', 'u'),
        ('ñ', 'n'), ('Ñ', 'n'),
    ]:
        normalized = func.replace(normalized, source, replacement)
    return normalized


def _normalize_rut_expression(expr):
    normalized = func.replace(expr, '.', '')
    normalized = func.replace(normalized, '-', '')
    return func.lower(normalized)


def _normalize_query_text(q: str) -> str:
    normalized = q.casefold()
    for source, replacement in [
        ('á', 'a'), ('Á', 'a'),
        ('é', 'e'), ('É', 'e'),
        ('í', 'i'), ('Í', 'i'),
        ('ó', 'o'), ('Ó', 'o'),
        ('ú', 'u'), ('Ú', 'u'),
        ('ü', 'u'), ('Ü', 'u'),
        ('ñ', 'n'), ('Ñ', 'n'),
    ]:
        normalized = normalized.replace(source, replacement)
    return normalized


def _normalize_query_rut(q: str) -> str:
    cleaned = re.sub(r'[^0-9kK]', '', q)
    return cleaned.lower()


def _normalize_rut_text(value: str) -> str:
    cleaned = re.sub(r'[^0-9kK]', '', value)
    return cleaned.lower()


def _normalize_search_text(value: str) -> str:
    normalized = value.casefold()
    for source, replacement in [
        ('á', 'a'), ('Á', 'a'),
        ('é', 'e'), ('É', 'e'),
        ('í', 'i'), ('Í', 'i'),
        ('ó', 'o'), ('Ó', 'o'),
        ('ú', 'u'), ('Ú', 'u'),
        ('ü', 'u'), ('Ü', 'u'),
        ('ñ', 'n'), ('Ñ', 'n'),
    ]:
        normalized = normalized.replace(source, replacement)
    return normalized


def patient_to_read(db: Session, patient: Patient) -> PatientRead:
    root_id = patient.root_patient_id or patient.id
    latest_log = db.scalar(
        select(WorkflowLog)
        .where(WorkflowLog.patient_id == patient.id)
        .order_by(WorkflowLog.fecha_hora.desc())
        .limit(1)
    )
    logs_count = db.scalar(select(func.count()).select_from(WorkflowLog).where(WorkflowLog.patient_id == patient.id)) or 0
    ficha_count = db.scalar(
        select(func.count()).select_from(Patient).where(
            or_(Patient.root_patient_id == root_id, Patient.id == root_id)
        )
    ) or 1
    return PatientRead.model_validate(patient).model_copy(
        update={
            "root_patient_id": root_id,
            "ficha_label": f"F{patient.ficha_number or 1}",
            "ficha_count": ficha_count,
            "latest_purpose": latest_log.purpose if latest_log else None,
            "logs_count": logs_count,
        }
    )


@router.get("", response_model=list[PatientRead])
def list_patients(
    q: str | None = Query(default=None, description="Buscar por RUT o nombre"),
    stage: str | None = Query(default=None, description="Filtrar por etapa actual"),
    include_all: bool = Query(default=False, description="Incluir todas las etapas visibles"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Patient)
    
    if stage:
        stmt = stmt.where(Patient.current_stage == stage)
    elif not include_all:
        processable_stages = get_processable_stages(current_user.role, db)
        if processable_stages:
            stmt = stmt.where(Patient.current_stage.in_(processable_stages))
    
    root_sort = func.coalesce(Patient.root_patient_id, Patient.id)
    stmt = stmt.order_by(Patient.is_priority.desc(), root_sort.asc(), Patient.ficha_number.asc(), Patient.created_at.desc())
    patients = db.scalars(stmt).all()

    if q:
        normalized_query = _normalize_search_text(q)
        rut_query = _normalize_query_rut(q)
        patients = [
            patient for patient in patients
            if normalized_query in _normalize_search_text(patient.full_name)
            or (rut_query and rut_query in _normalize_rut_text(patient.rut))
        ]

    return [patient_to_read(db, patient) for patient in patients]


@router.get("/{patient_id}", response_model=PatientRead)
def get_patient(patient_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return patient_to_read(db, patient)


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exists = db.scalar(select(Patient).where(Patient.rut == payload.rut))
    if exists:
        raise HTTPException(status_code=409, detail="Ya existe un paciente con ese RUT")
    patient = Patient(**payload.model_dump(), created_by_user_id=current_user.id)
    db.add(patient)
    db.flush()
    patient.root_patient_id = patient.id
    db.commit()
    db.refresh(patient)
    return patient_to_read(db, patient)


@router.post("/{patient_id}/fichas", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient_ficha(
    patient_id: int,
    payload: PatientFichaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = db.get(Patient, patient_id)
    if not source:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    if source.current_stage not in {Stage.DOSIMETRIA, Stage.FISICA_MEDICA}:
        raise HTTPException(status_code=400, detail="Solo se puede crear una nueva ficha en Dosimetría o Física Médica")
    if payload.current_stage != source.current_stage:
        raise HTTPException(status_code=400, detail="La nueva ficha debe crearse en la etapa actual del paciente")

    root_id = source.root_patient_id or source.id
    max_ficha = db.scalar(
        select(func.max(Patient.ficha_number)).where(
            or_(Patient.root_patient_id == root_id, Patient.id == root_id)
        )
    ) or source.ficha_number or 1

    patient = Patient(
        rut=source.rut,
        full_name=source.full_name,
        sex=source.sex,
        age=source.age,
        phone=source.phone,
        trusted_contact_phone=source.trusted_contact_phone,
        street=source.street,
        commune=source.commune,
        region=source.region,
        current_stage=payload.current_stage,
        root_patient_id=root_id,
        ficha_number=max_ficha + 1,
        is_priority=False,
        created_by_user_id=current_user.id,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient_to_read(db, patient)


@router.patch("/{patient_id}/priority", response_model=PatientRead)
def update_patient_priority(
    patient_id: int,
    payload: PatientPriorityUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    patient.is_priority = payload.is_priority

    db.commit()
    db.refresh(patient)
    return patient_to_read(db, patient)


@router.post("/upload-txt", response_model=UploadPatientsResponse)
async def upload_patients_txt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if not file.filename.lower().endswith(".txt"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .txt")
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    result = import_patients_from_text(db, text, current_user=current_user)
    return UploadPatientsResponse(inserted=result.inserted, skipped=result.skipped, errors=result.errors)


@router.get("/{patient_id}/logs", response_model=list[WorkflowLogRead])
def get_patient_logs(patient_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return db.scalars(
        select(WorkflowLog)
        .options(joinedload(WorkflowLog.user))
        .where(WorkflowLog.patient_id == patient_id)
        .order_by(WorkflowLog.fecha_hora.desc())
    ).all()
