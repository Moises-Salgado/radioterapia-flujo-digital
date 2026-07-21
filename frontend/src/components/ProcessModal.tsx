import { useState } from 'react';
import type { Patient, Purpose, Stage } from '../types/domain';

const stageClassByStage: Record<Stage, string> = {
  Ingreso: 'ingreso',
  Simulación: 'simulacion',
  Dosimetría: 'dosimetria',
  'Física Médica': 'fisica',
  Impresión: 'impresion',
  Enfermería: 'enfermeria',
  Citación: 'citacion',
  'Inicio/Termino de tratamiento': 'tratamiento',
  Finalizado: 'finalizado',
};

function getNextStage(stage: Stage, purpose?: Purpose): Stage {
  if (stage === 'Impresión' && purpose === 'Devolver a Física Médica') return 'Física Médica';
  if (purpose === 'Fallecido / no disponible') return 'Finalizado';
  if (stage === 'Ingreso') return 'Simulación';
  if (stage === 'Simulación') return 'Dosimetría';
  if (stage === 'Dosimetría') return 'Física Médica';
  if (stage === 'Física Médica') return 'Impresión';
  if (stage === 'Impresión') return 'Enfermería';
  if (stage === 'Enfermería') return 'Citación';
  if (stage === 'Citación') return 'Inicio/Termino de tratamiento';
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
  onConfirm: (notesByPatient: Record<number, string | undefined>) => Promise<void>;
}) {
  const [notesByPatient, setNotesByPatient] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onConfirm(
        Object.fromEntries(
          patients.map((patient) => {
            const notes = notesByPatient[patient.id]?.trim();
            return [patient.id, notes || undefined];
          }),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card process-modal-card">
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
                <div key={patient.id} className="modal-patient-process-card">
                  <div className="modal-summary-row">
                    <div>
                      <strong>{patient.full_name}</strong>
                      <span>{patient.rut} - {patient.ficha_label} - {purpose}</span>
                    </div>
                    <div className="stage-transition">
                      <span className={`stage-pill stage-pill-${stageClassByStage[patient.current_stage]}`}>{patient.current_stage}</span>
                      <span className="stage-transition-arrow">→</span>
                      <span className={`stage-pill stage-pill-${stageClassByStage[nextStage]}`}>{nextStage}</span>
                    </div>
                  </div>
                  <label className="field-label compact" htmlFor={`notes-${patient.id}`}>
                    Observación para {patient.ficha_label}
                  </label>
                  <textarea
                    id={`notes-${patient.id}`}
                    rows={3}
                    placeholder={`Opcional para ${patient.full_name}`}
                    value={notesByPatient[patient.id] ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNotesByPatient((current) => ({ ...current, [patient.id]: value }));
                    }}
                  />
                </div>
              );
            })}
          </div>
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
