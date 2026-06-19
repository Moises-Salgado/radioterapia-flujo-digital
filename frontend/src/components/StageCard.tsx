import type { Stage } from '../types/domain';

const stageIcons: Record<Stage, string> = {
  Dosimetría: '✓',
  'Física Médica': '⚛',
  Impresión: '▣',
  Enfermería: '✚',
  Citación: '▦',
  Finalizado: '★',
};

const stageClassByStage: Record<Stage, string> = {
  Dosimetría: 'dosimetria',
  'Física Médica': 'fisica',
  Impresión: 'impresion',
  Enfermería: 'enfermeria',
  Citación: 'citacion',
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
