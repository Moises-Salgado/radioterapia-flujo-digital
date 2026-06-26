import type { Stage } from '../types/domain';

const stageIcons: Record<Stage, string> = {
  Ingreso: '+',
  Simulaci\u00f3n: 'S',
  Dosimetr\u00eda: 'D',
  'F\u00edsica M\u00e9dica': 'F',
  Impresi\u00f3n: 'I',
  Enfermer\u00eda: 'E',
  Citaci\u00f3n: 'C',
  'Inicio/Termino de tratamiento': 'T',
  Finalizado: '*',
};

const stageClassByStage: Record<Stage, string> = {
  Ingreso: 'ingreso',
  Simulaci\u00f3n: 'simulacion',
  Dosimetr\u00eda: 'dosimetria',
  'F\u00edsica M\u00e9dica': 'fisica',
  Impresi\u00f3n: 'impresion',
  Enfermer\u00eda: 'enfermeria',
  Citaci\u00f3n: 'citacion',
  'Inicio/Termino de tratamiento': 'tratamiento',
  Finalizado: 'finalizado',
};

export function StageCard({
  stage,
  index,
  count,
  active,
  disabled,
  onClick,
}: {
  stage: Stage;
  index: number;
  count: number;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`stage-card stage-${stageClassByStage[stage]} ${active ? 'stage-card-active' : ''} ${disabled ? 'stage-card-disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
    >
      <div className="stage-card-top">
        <div className="stage-number">Etapa {index}</div>
        <div className="stage-icon">{stageIcons[stage]}</div>
      </div>
      <div className="stage-card-copy">
        <strong>{stage}</strong>
        <span>{count} paciente{count === 1 ? '' : 's'}</span>
      </div>
    </button>
  );
}
