from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import get_settings

settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_existing_schema(bind: Engine) -> None:
    if bind.dialect.name != "sqlite":
        with bind.begin() as conn:
            if bind.dialect.name == "postgresql":
                exists = conn.exec_driver_sql(
                    """
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_name = 'patients'
                    """
                ).first()
                if exists:
                    column_exists = conn.exec_driver_sql(
                        """
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name = 'patients' AND column_name = 'is_priority'
                        """
                    ).first()
                    if not column_exists:
                        conn.exec_driver_sql("ALTER TABLE patients ADD COLUMN is_priority BOOLEAN NOT NULL DEFAULT FALSE")
            return

    if bind.dialect.name != "sqlite":
        return

    with bind.connect() as conn:
        table_exists = conn.exec_driver_sql(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='patients'"
        ).first()
        if not table_exists:
            return

        columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(patients)").all()}
        indexes = conn.exec_driver_sql("PRAGMA index_list(patients)").all()
        has_unique_rut = False
        for index in indexes:
            if not index[2]:
                continue
            indexed_columns = [info[2] for info in conn.exec_driver_sql(f"PRAGMA index_info({index[1]})").all()]
            if indexed_columns == ["rut"]:
                has_unique_rut = True
                break

        if "is_priority" not in columns:
            conn.exec_driver_sql("ALTER TABLE patients ADD COLUMN is_priority BOOLEAN NOT NULL DEFAULT 0")
            columns.add("is_priority")

        needs_rebuild = "ficha_number" not in columns or "root_patient_id" not in columns or "treatment_number" in columns or has_unique_rut
        if not needs_rebuild:
            return

        root_expression = "COALESCE(root_patient_id, id)" if "root_patient_id" in columns else "id"
        if "ficha_number" in columns:
            ficha_expression = "COALESCE(ficha_number, 1)"
        elif "treatment_number" in columns:
            ficha_expression = "COALESCE(treatment_number, 1)"
        else:
            ficha_expression = "1"

        conn.exec_driver_sql("PRAGMA foreign_keys=OFF")
        conn.exec_driver_sql("BEGIN")
        try:
            conn.exec_driver_sql(
                """
                CREATE TABLE patients_new (
                    id INTEGER NOT NULL,
                    rut VARCHAR(30) NOT NULL,
                    full_name VARCHAR(180) NOT NULL,
                    sex VARCHAR(20) NOT NULL,
                    age INTEGER NOT NULL,
                    phone VARCHAR(50),
                    trusted_contact_phone VARCHAR(50),
                    street VARCHAR(180),
                    commune VARCHAR(100),
                    region VARCHAR(100),
                    current_stage VARCHAR(50) NOT NULL,
                    root_patient_id INTEGER,
                    ficha_number INTEGER NOT NULL DEFAULT 1,
                    is_priority BOOLEAN NOT NULL DEFAULT 0,
                    created_by_user_id INTEGER,
                    created_at DATETIME NOT NULL,
                    PRIMARY KEY (id),
                    FOREIGN KEY(root_patient_id) REFERENCES patients (id),
                    FOREIGN KEY(created_by_user_id) REFERENCES users (id)
                )
                """
            )
            conn.exec_driver_sql(
                f"""
                INSERT INTO patients_new (
                    id, rut, full_name, sex, age, phone, trusted_contact_phone, street, commune, region,
                    current_stage, root_patient_id, ficha_number, is_priority, created_by_user_id, created_at
                )
                SELECT
                    id, rut, full_name, sex, age, phone, trusted_contact_phone, street, commune, region,
                    current_stage, {root_expression}, {ficha_expression}, COALESCE(is_priority, 0), created_by_user_id, created_at
                FROM patients
                """
            )
            conn.exec_driver_sql("DROP TABLE patients")
            conn.exec_driver_sql("ALTER TABLE patients_new RENAME TO patients")
            conn.exec_driver_sql("CREATE INDEX ix_patients_id ON patients (id)")
            conn.exec_driver_sql("CREATE INDEX ix_patients_rut ON patients (rut)")
            conn.exec_driver_sql("CREATE INDEX ix_patients_full_name ON patients (full_name)")
            conn.exec_driver_sql("CREATE INDEX ix_patients_current_stage ON patients (current_stage)")
            conn.exec_driver_sql("CREATE INDEX ix_patients_root_patient_id ON patients (root_patient_id)")
            conn.exec_driver_sql("COMMIT")
        except Exception:
            conn.exec_driver_sql("ROLLBACK")
            raise
        finally:
            conn.exec_driver_sql("PRAGMA foreign_keys=ON")
