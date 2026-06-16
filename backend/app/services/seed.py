from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.entities import Patient, Role, User
from app.services.patient_importer import import_patients_from_text

SAMPLE_PATIENTS = """RUT,Nombre,Sexo,Edad,Telefono,ContactoConfianza,Calle,Comuna,Region
11111111-1,Juan Pérez González,M,58,+56911111111,+56921111111,Av. Los Carrera 120,Concepción,Biobío
22222222-2,María Fernanda Soto,F,46,+56922222222,+56932222222,Freire 855,Concepción,Biobío
33333333-3,Carlos Andrés Muñoz,M,63,+56933333333,+56943333333,Aníbal Pinto 333,Talcahuano,Biobío
44444444-4,Patricia Valenzuela Ríos,F,51,+56944444444,+56954444444,Los Aromos 456,San Pedro de la Paz,Biobío
55555555-5,Héctor Salinas Vera,M,70,+56955555555,+56965555555,Colo Colo 789,Chiguayante,Biobío
66666666-6,Daniela Andrea Morales,F,39,+56966666666,+56976666666,Barros Arana 250,Concepción,Biobío
77777777-7,Roberto Ignacio Castro,M,55,+56977777777,+56987777777,Prat 900,Hualpén,Biobío
88888888-8,Ana Luisa Paredes,F,61,+56988888888,+56998888888,Paicaví 1400,Concepción,Biobío
99999999-9,Marcelo Fuentes Núñez,M,48,+56999999999,+56919999999,Las Heras 100,Lota,Biobío
10101010-0,Gloria Eliana Lagos,F,67,+56910101010,+56920101010,Manuel Rodríguez 432,Coronel,Biobío
"""


def seed_admin(db: Session) -> None:
    admin = db.scalar(select(User).where(User.username == "admin"))
    if admin:
        return
    db.add(
        User(
            full_name="Administrador del Sistema",
            username="admin",
            password_hash=get_password_hash("admin123"),
            role=Role.ADMIN,
            is_active=True,
        )
    )
    db.commit()


def seed_demo_users(db: Session) -> None:
    demo_users = [
        ("fisico", "Físico Médico Demo", Role.FISICO),
        ("tecnologo", "Tecnólogo Médico Demo", Role.TECNOLOGO),
        ("enfermeria", "Enfermería Demo", Role.ENFERMERO),
    ]
    for username, full_name, role in demo_users:
        exists = db.scalar(select(User).where(User.username == username))
        if not exists:
            db.add(User(full_name=full_name, username=username, password_hash=get_password_hash("demo123"), role=role))
    db.commit()


def seed_patients(db: Session) -> None:
    count = db.query(Patient).count()
    if count > 0:
        return
    import_patients_from_text(db, SAMPLE_PATIENTS, current_user=None)


def seed_all(db: Session) -> None:
    seed_admin(db)
    seed_demo_users(db)
    seed_patients(db)
