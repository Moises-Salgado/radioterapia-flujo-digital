from datetime import datetime
import re

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import StageName, PurposeName
from app.schemas.users import UserRead


def format_rut(value: str) -> str:
    clean = re.sub(r"[^0-9kK]", "", value or "").upper()
    if len(clean) not in (8, 9):
        raise ValueError("RUT debe tener formato 0.000.000-0 o 00.000.000-0")

    body, verifier = clean[:-1], clean[-1]
    if not body.isdigit() or not re.fullmatch(r"[0-9K]", verifier):
        raise ValueError("RUT inválido")

    groups: list[str] = []
    while body:
        groups.insert(0, body[-3:])
        body = body[:-3]
    return f"{'.'.join(groups)}-{verifier}"


class PatientBase(BaseModel):
    rut: str = Field(min_length=4, max_length=30)
    full_name: str = Field(min_length=3, max_length=180)
    sex: str = Field(min_length=1, max_length=20)
    age: int = Field(ge=0, le=130)
    phone: str | None = None
    trusted_contact_phone: str | None = None
    street: str | None = None
    commune: str | None = None
    region: str | None = None

    @field_validator("rut")
    @classmethod
    def validate_rut(cls, value: str) -> str:
        return format_rut(value)


class PatientCreate(PatientBase):
    pass


class PatientRead(PatientBase):
    id: int
    current_stage: StageName
    created_by_user_id: int | None
    created_at: datetime
    latest_purpose: PurposeName | None = None
    logs_count: int = 0

    model_config = {"from_attributes": True}


class WorkflowLogRead(BaseModel):
    id: int
    patient_id: int
    processed_stage: StageName
    user_id: int
    user: UserRead | None = None
    purpose: PurposeName
    fecha_hora: datetime
    notes: str | None = None

    model_config = {"from_attributes": True}


class UploadPatientsResponse(BaseModel):
    inserted: int
    skipped: int
    errors: list[str]
