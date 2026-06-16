import csv
from dataclasses import dataclass
from io import StringIO

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Patient, User
from app.schemas.patients import format_rut


@dataclass
class ImportResult:
    inserted: int
    skipped: int
    errors: list[str]


def _clean(value: str | None) -> str:
    return (value or "").strip()


def import_patients_from_text(db: Session, text: str, current_user: User | None = None) -> ImportResult:
    """
    Formato esperado:
    RUT,Nombre,Sexo,Edad,Telefono,ContactoConfianza,Calle,Comuna,Region

    Se aceptan líneas vacías y una cabecera opcional.
    """
    inserted = 0
    skipped = 0
    errors: list[str] = []

    reader = csv.reader(StringIO(text))
    for line_number, row in enumerate(reader, start=1):
        if not row or all(not _clean(col) for col in row):
            continue

        normalized_first = _clean(row[0]).lower()
        if line_number == 1 and normalized_first in {"rut", "identificacion", "identificación"}:
            continue

        if len(row) != 9:
            errors.append(f"Línea {line_number}: se esperaban 9 campos y llegaron {len(row)}")
            continue

        rut_raw, full_name, sex, age_raw, phone, trusted, street, commune, region = [_clean(col) for col in row]
        try:
            rut = format_rut(rut_raw)
        except ValueError as exc:
            errors.append(f"Línea {line_number}: {exc}")
            continue
        if not rut or not full_name:
            errors.append(f"Línea {line_number}: RUT y nombre son obligatorios")
            continue
        try:
            age = int(age_raw)
        except ValueError:
            errors.append(f"Línea {line_number}: edad inválida '{age_raw}'")
            continue

        exists = db.scalar(select(Patient).where(Patient.rut == rut))
        if exists:
            skipped += 1
            continue

        patient = Patient(
            rut=rut,
            full_name=full_name,
            sex=sex,
            age=age,
            phone=phone,
            trusted_contact_phone=trusted,
            street=street,
            commune=commune,
            region=region,
            created_by_user_id=current_user.id if current_user else None,
        )
        db.add(patient)
        inserted += 1

    db.commit()
    return ImportResult(inserted=inserted, skipped=skipped, errors=errors)
