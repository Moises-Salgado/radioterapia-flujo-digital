import { useState } from 'react';
import type { Patient, Stage } from '../types/domain';

const NEXT_STAGE_BY_STAGE: Partial<Record<Stage, Stage>> = {
  Dosimetría: 'Física Médica',
  'Física Médica': 'Impresión',
  Impresión: 'Enfermería',
  Enfermería: 'Citación',
  Citación: 'Finalizado',
};

const stageClassByStage: Record<Stage, string> = {
  Dosimetría: 'dosimetria',
  'Física Médica': 'fisica',
  Impresión: 'impresion',
  Enfermería: 'enfermeria',
  Citación: 'citacion',
  Finalizado: 'finalizado',
};

export function ProcessModal({
  patients,
  onClose,
  onConfirm,
}: {
  patients: Patient[];
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onConfirm(notes.trim() || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <strong>Confirmar procesamiento</strong>
            <span>
              {patients.length > 1 ? `${patients.length} pacientes seleccionados` : `${patients[0].full_name} · ${patients[0].current_stage}`}
            </span>
          </div>
          <button className="icon-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-summary">
          {patients.map((patient) => (
            <div key={patient.id} className="modal-summary-row">
              <div>
                <strong>{patient.full_name}</strong>
                <span>{patient.rut}</span>
              </div>
              <div className="stage-transition">
                <span className={`stage-pill stage-pill-${stageClassByStage[patient.current_stage]}`}>{patient.current_stage}</span>
                <span className="stage-transition-arrow">→</span>
                <span className={`stage-pill stage-pill-${stageClassByStage[NEXT_STAGE_BY_STAGE[patient.current_stage] ?? 'Finalizado']}`}>
                  {NEXT_STAGE_BY_STAGE[patient.current_stage] ?? 'Finalizado'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <label className="field-label" htmlFor="notes">Observaciones</label>
        <textarea
          id="notes"
          rows={4}
          placeholder="Opcional"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose} disabled={submitting}>Cancelar</button>
          <button className="primary-button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Guardando...' : 'Confirmar y avanzar'}
          </button>
        </div>
      </div>
    </div>
  );
}
