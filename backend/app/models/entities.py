from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Role:
    ADMIN = "Admin"
    FISICO = "Físico Médico"
    TECNOLOGO = "Tecnólogo Médico"
    ENFERMERO = "Enfermero/a"

    ALL = [ADMIN, FISICO, TECNOLOGO, ENFERMERO]


class Stage:
    DOSIMETRIA = "Dosimetría"
    FISICA_MEDICA = "Física Médica"
    IMPRESION = "Impresión"
    ENFERMERIA = "Enfermería"
    CITACION = "Citación"
    FINALIZADO = "Finalizado"

    ORDER = [DOSIMETRIA, FISICA_MEDICA, IMPRESION, ENFERMERIA, CITACION]
    ALL = ORDER + [FINALIZADO]


class Purpose:
    MEDICION = "Medición"
    FISICA_MEDICA = "Física Médica"
    PLANIFICACION = "Planificación"
    REPLANIFICACION = "Replanificación"
    CALCULAR_DOSIS = "Calcular Dosis"
    IMPRIMIR = "Imprimir"
    DEVOLVER_FISICA_MEDICA = "Devolver a Física Médica"
    RECEPCION = "Recepción"

    ALL = [
        MEDICION,
        FISICA_MEDICA,
        PLANIFICACION,
        REPLANIFICACION,
        CALCULAR_DOSIS,
        IMPRIMIR,
        DEVOLVER_FISICA_MEDICA,
        RECEPCION,
    ]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    username: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default=Role.TECNOLOGO)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    created_patients: Mapped[list["Patient"]] = relationship(back_populates="created_by")
    workflow_logs: Mapped[list["WorkflowLog"]] = relationship(back_populates="user")


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rut: Mapped[str] = mapped_column(String(30), nullable=False, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    sex: Mapped[str] = mapped_column(String(20), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    trusted_contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    street: Mapped[str | None] = mapped_column(String(180), nullable=True)
    commune: Mapped[str | None] = mapped_column(String(100), nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    current_stage: Mapped[str] = mapped_column(String(50), nullable=False, default=Stage.DOSIMETRIA, index=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    created_by: Mapped[User | None] = relationship(back_populates="created_patients")
    workflow_logs: Mapped[list["WorkflowLog"]] = relationship(back_populates="patient", cascade="all, delete-orphan")


class WorkflowLog(Base):
    __tablename__ = "workflow_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    processed_stage: Mapped[str] = mapped_column(String(50), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(String(50), nullable=False)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    patient: Mapped[Patient] = relationship(back_populates="workflow_logs")
    user: Mapped[User] = relationship(back_populates="workflow_logs")
