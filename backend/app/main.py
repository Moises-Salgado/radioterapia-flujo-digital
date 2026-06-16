from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, patients, users, workflow
from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.services.seed import seed_all

settings = get_settings()

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    if settings.enable_demo_data:
        with SessionLocal() as db:
            seed_all(db)


@app.get("/health", tags=["Sistema"])
def health_check():
    return {"status": "ok", "app": settings.app_name}


app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(workflow.router, prefix="/api")
