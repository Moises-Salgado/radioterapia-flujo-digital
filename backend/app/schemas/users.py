from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.common import RoleName


class UserBase(BaseModel):
    full_name: str = Field(min_length=3, max_length=150)
    username: str = Field(min_length=3, max_length=80)
    role: RoleName
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=128)


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=3, max_length=150)
    role: RoleName | None = None
    is_active: bool | None = None


class UserSelfUpdate(BaseModel):
    full_name: str = Field(min_length=3, max_length=150)
    username: str = Field(min_length=3, max_length=80)
    password: str | None = Field(default=None, min_length=6, max_length=128)


class UserPasswordUpdate(BaseModel):
    password: str = Field(min_length=6, max_length=128)


class UserRead(UserBase):
    id: int
    created_at: datetime
    processable_stages: list[str] = []

    model_config = {"from_attributes": True}
