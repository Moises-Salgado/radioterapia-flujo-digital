from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.entities import Stage


class RoleDefinitionBase(BaseModel):
    name: str = Field(min_length=3, max_length=80)
    processable_stages: list[str] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("El nombre del rol es obligatorio")
        return cleaned

    @field_validator("processable_stages")
    @classmethod
    def validate_stages(cls, values: list[str]) -> list[str]:
        invalid = [stage for stage in values if stage not in Stage.ORDER]
        if invalid:
            raise ValueError(f"Etapas invalidas: {', '.join(invalid)}")
        return [stage for stage in Stage.ORDER if stage in values]


class RoleDefinitionCreate(RoleDefinitionBase):
    pass


class RoleDefinitionRead(RoleDefinitionBase):
    id: int
    is_system: bool
    created_at: datetime

    model_config = {"from_attributes": True}
