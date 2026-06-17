from typing import Literal

RoleName = Literal["Admin", "Físico Médico", "Tecnólogo Médico", "Enfermero/a"]
StageName = Literal["Dosimetría", "Física Médica", "Impresión", "Enfermería", "Citación", "Finalizado"]
PurposeName = Literal[
    "Medición",
    "Física Médica",
    "Planificación",
    "Replanificación",
    "Calcular Dosis",
    "Imprimir",
    "Devolver a Física Médica",
    "Recepción",
]
