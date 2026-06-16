from datetime import datetime

from pydantic import BaseModel, Field
from app.schemas.common import PurposeName, StageName
from app.schemas.patients import PatientRead, WorkflowLogRead


class ProcessStageRequest(BaseModel):
    purpose: PurposeName
    notes: str | None = Field(default=None, max_length=1000)


class ProcessStageResponse(BaseModel):
    patient: PatientRead
    log: WorkflowLogRead


class StageSummaryItem(BaseModel):
    stage: StageName
    count: int


class CompletedPatientItem(BaseModel):
    patient: PatientRead
    finished_at: datetime

    model_config = {"from_attributes": True}


class StageSummaryResponse(BaseModel):
    stages: list[StageSummaryItem]
