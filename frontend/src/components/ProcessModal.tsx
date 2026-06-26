import { useState } from 'react';
import type { Patient, Purpose, Stage } from '../types/domain';

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

function getNextStage(stage: Stage, purpose?: Purpose): Stage {
  if (stage === 'Impresi\u00f3n' && purpose === 'Devolver a F\u00edsica M\u00e9dica') return 'F\u00edsica M\u00e9dica';
  if (purpose === 'Fallecido / no disponible') return 'Finalizado';
  if (stage === 'Ingreso') return 'Simulaci\u00f3n';
  if (stage === 'Simulaci\u00f3n') return 'Dosimetr\u00eda';
  if (stage === 'Dosimetr\u00eda') return 'F\u00edsica M\u00e9dica';
  if (stage === 'F\u00edsica M\u00e9dica') return 'Impresi\u00f3n';
  if (stage === 'Impresi\u00f3n') return 'Enfermer\u00eda';
  if (stage === 'Enfermer\u00eda') return 'Citaci\u00f3n';
  if (stage === 'Citaci\u00f3n') return 'Inicio/Termino de tratamiento';
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
              {patients.length > 1 ? `${patients.length} pacientes seleccionados` : `${patients[0].full_name} - ${patients[0].current_stage}`}
            </span>
          </div>
          <button className="icon-button" onClick={onClose}>x</button>
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
                    <span>{patient.rut} - {purpose}</span>
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
