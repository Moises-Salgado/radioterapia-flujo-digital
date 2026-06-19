import { useState } from 'react';
import type { Patient, Purpose, Stage } from '../types/domain';

const stageClassByStage: Record<Stage, string> = {
  Dosimetría: 'dosimetria',
  'Física Médica': 'fisica',
  Impresión: 'impresion',
  Enfermería: 'enfermeria',
  Citación: 'citacion',
  Finalizado: 'finalizado',
};

function getNextStage(stage: Stage, purpose?: Purpose): Stage {
  if (stage === 'Impresión' && purpose === 'Devolver a Física Médica') return 'Física Médica';
  if (stage === 'Dosimetría') return 'Física Médica';
  if (stage === 'Física Médica') return 'Impresión';
  if (stage === 'Impresión') return 'Enfermería';
  if (stage === 'Enfermería') return 'Citación';
  if (stage === 'Citación') return 'Finalizado';
  return 'Finalizado';
}

export function ProcessModal({
  patients,
  purposesByPatient,
  onClose,
  onConfirm,
}: {
  patients: Patient[];
  purposesByPatient: Record<number, Purpose>;
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

        <div className="modal-body">
        <div className="modal-summary">
          {patients.map((patient) => {
            const purpose = purposesByPatient[patient.id];
            const nextStage = getNextStage(patient.current_stage, purpose);
            return (
              <div key={patient.id} className="modal-summary-row">
                <div>
                  <strong>{patient.full_name}</strong>
                  <span>{patient.rut} · {purpose}</span>
                </div>
                <div className="stage-transition">
                  <span className={`stage-pill stage-pill-${stageClassByStage[patient.current_stage]}`}>{patient.current_stage}</span>
                  <span className="stage-transition-arrow">→</span>
                  <span className={`stage-pill stage-pill-${stageClassByStage[nextStage]}`}>{nextStage}</span>
                </div>
              </div>
            );
          })}
        </div>

        <label className="field-label" htmlFor="notes">Observaciones</label>
        <textarea
          id="notes"
          rows={4}
          placeholder="Opcional"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        </div>

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
