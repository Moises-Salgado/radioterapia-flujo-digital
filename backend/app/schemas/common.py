from typing import Literal

RoleName = str
StageName = Literal[
    "Ingreso",
    "Simulaci\u00f3n",
    "Dosimetr\u00eda",
    "F\u00edsica M\u00e9dica",
    "Impresi\u00f3n",
    "Enfermer\u00eda",
    "Citaci\u00f3n",
    "Inicio/Termino de tratamiento",
    "Finalizado",
]
PurposeName = Literal[
    "Simulaci\u00f3n",
    "Dosimetr\u00eda",
    "Medici\u00f3n",
    "F\u00edsica M\u00e9dica",
    "Planificaci\u00f3n",
    "Replanificaci\u00f3n",
    "Calcular Dosis",
    "Imprimir",
    "Devolver a F\u00edsica M\u00e9dica",
    "Citar",
    "Recepci\u00f3n",
    "Iniciar/terminar tratamiento",
    "Fallecido / no disponible",
]
