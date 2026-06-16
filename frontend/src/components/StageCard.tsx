import type { Stage } from '../types/domain';

const stageIcons: Record<Stage, string> = {
  Dosimetría: '✓',
  'Física Médica': '⚛',
  Impresión: '▣',
  Enfermería: '✚',
  Citación: '▦',
  Finalizado: '★',
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
      className={`stage-card ${active ? 'stage-card-active' : ''} ${disabled ? 'stage-card-disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
    >
      <div className="stage-number">{index}</div>
      <div className="stage-icon">{stageIcons[stage]}</div>
      <div>
        <strong>{stage}</strong>
        <span>{count} paciente{count === 1 ? '' : 's'}</span>
      </div>
    </button>
  );
}
