import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { patientsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Patient } from '../types/domain';

const emptyPatient = {
  rut: '',
  full_name: '',
  sex: 'Masculino',
  age: 0,
  phone: '+569',
  trusted_contact_phone: '+569',
  street: '',
  commune: '',
  region: '',
};

type SortKey = 'full_name' | 'rut' | 'ficha_number' | 'current_stage';
type SortDirection = 'asc' | 'desc';

const STAGE_ORDER = ['dosimetria', 'fisica medica', 'impresion', 'enfermeria', 'citacion', 'finalizado'];
const CHILE_REGIONS = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana de Santiago',
  "Libertador General Bernardo O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén del General Carlos Ibáñez del Campo',
  'Magallanes y de la Antártica Chilena',
];
const CHILE_COMMUNES_BY_REGION: Record<string, string[]> = {
  'Arica y Parinacota': ['Arica', 'Camarones', 'General Lagos', 'Putre'],
  Tarapacá: ['Alto Hospicio', 'Camiña', 'Colchane', 'Huara', 'Iquique', 'Pica', 'Pozo Almonte'],
  Antofagasta: ['Antofagasta', 'Calama', 'María Elena', 'Mejillones', 'Ollagüe', 'San Pedro de Atacama', 'Sierra Gorda', 'Taltal', 'Tocopilla'],
  Atacama: ['Alto del Carmen', 'Caldera', 'Chañaral', 'Copiapó', 'Diego de Almagro', 'Freirina', 'Huasco', 'Tierra Amarilla', 'Vallenar'],
  Coquimbo: ['Andacollo', 'Canela', 'Combarbalá', 'Coquimbo', 'Illapel', 'La Higuera', 'La Serena', 'Los Vilos', 'Monte Patria', 'Ovalle', 'Paiguano', 'Punitaqui', 'Río Hurtado', 'Salamanca', 'Vicuña'],
  Valparaíso: ['Algarrobo', 'Cabildo', 'Calera', 'Calle Larga', 'Cartagena', 'Casablanca', 'Catemu', 'Concón', 'El Quisco', 'El Tabo', 'Hijuelas', 'Isla de Pascua', 'Juan Fernández', 'La Cruz', 'La Ligua', 'Limache', 'Llaillay', 'Los Andes', 'Nogales', 'Olmué', 'Panquehue', 'Papudo', 'Petorca', 'Puchuncaví', 'Putaendo', 'Quillota', 'Quilpué', 'Quintero', 'Rinconada', 'San Antonio', 'San Esteban', 'San Felipe', 'Santa María', 'Santo Domingo', 'Valparaíso', 'Villa Alemana', 'Viña del Mar', 'Zapallar'],
  'Metropolitana de Santiago': ['Alhué', 'Buin', 'Calera de Tango', 'Cerrillos', 'Cerro Navia', 'Colina', 'Conchalí', 'Curacaví', 'El Bosque', 'El Monte', 'Estación Central', 'Huechuraba', 'Independencia', 'Isla de Maipo', 'La Cisterna', 'La Florida', 'La Granja', 'La Pintana', 'La Reina', 'Lampa', 'Las Condes', 'Lo Barnechea', 'Lo Espejo', 'Lo Prado', 'Macul', 'Maipú', 'María Pinto', 'Melipilla', 'Ñuñoa', 'Padre Hurtado', 'Paine', 'Pedro Aguirre Cerda', 'Peñaflor', 'Peñalolén', 'Pirque', 'Providencia', 'Pudahuel', 'Puente Alto', 'Quilicura', 'Quinta Normal', 'Recoleta', 'Renca', 'San Bernardo', 'San Joaquín', 'San José de Maipo', 'San Miguel', 'San Pedro', 'San Ramón', 'Santiago', 'Talagante', 'Tiltil', 'Vitacura'],
  "Libertador General Bernardo O'Higgins": ['Chépica', 'Chimbarongo', 'Codegua', 'Coinco', 'Coltauco', 'Doñihue', 'Graneros', 'La Estrella', 'Las Cabras', 'Litueche', 'Lolol', 'Machalí', 'Malloa', 'Marchihue', 'Mostazal', 'Nancagua', 'Navidad', 'Olivar', 'Palmilla', 'Paredones', 'Peralillo', 'Peumo', 'Pichidegua', 'Pichilemu', 'Placilla', 'Pumanque', 'Quinta de Tilcoco', 'Rancagua', 'Rengo', 'Requínoa', 'San Fernando', 'San Vicente', 'Santa Cruz'],
  Maule: ['Cauquenes', 'Chanco', 'Colbún', 'Constitución', 'Curepto', 'Curicó', 'Empedrado', 'Hualañé', 'Licantén', 'Linares', 'Longaví', 'Maule', 'Molina', 'Parral', 'Pelarco', 'Pelluhue', 'Pencahue', 'Rauco', 'Retiro', 'Río Claro', 'Romeral', 'Sagrada Familia', 'San Clemente', 'San Javier', 'San Rafael', 'Talca', 'Teno', 'Vichuquén', 'Villa Alegre', 'Yerbas Buenas'],
  Ñuble: ['Bulnes', 'Chillán', 'Chillán Viejo', 'Cobquecura', 'Coelemu', 'Coihueco', 'El Carmen', 'Ninhue', 'Ñiquén', 'Pemuco', 'Pinto', 'Portezuelo', 'Quillón', 'Quirihue', 'Ránquil', 'San Carlos', 'San Fabián', 'San Ignacio', 'San Nicolás', 'Treguaco', 'Yungay'],
  Biobío: ['Alto Biobío', 'Antuco', 'Arauco', 'Cabrero', 'Cañete', 'Chiguayante', 'Concepción', 'Contulmo', 'Coronel', 'Curanilahue', 'Florida', 'Hualpén', 'Hualqui', 'Laja', 'Lebu', 'Los Álamos', 'Los Ángeles', 'Lota', 'Mulchén', 'Nacimiento', 'Negrete', 'Penco', 'Quilaco', 'Quilleco', 'San Pedro de la Paz', 'San Rosendo', 'Santa Bárbara', 'Santa Juana', 'Talcahuano', 'Tirúa', 'Tomé', 'Tucapel', 'Yumbel'],
  'La Araucanía': ['Angol', 'Carahue', 'Cholchol', 'Collipulli', 'Cunco', 'Curacautín', 'Curarrehue', 'Ercilla', 'Freire', 'Galvarino', 'Gorbea', 'Lautaro', 'Loncoche', 'Lonquimay', 'Los Sauces', 'Lumaco', 'Melipeuco', 'Nueva Imperial', 'Padre Las Casas', 'Perquenco', 'Pitrufquén', 'Pucón', 'Purén', 'Renaico', 'Saavedra', 'Temuco', 'Teodoro Schmidt', 'Toltén', 'Traiguén', 'Victoria', 'Vilcún', 'Villarrica'],
  'Los Ríos': ['Corral', 'Futrono', 'La Unión', 'Lago Ranco', 'Lanco', 'Los Lagos', 'Máfil', 'Mariquina', 'Paillaco', 'Panguipulli', 'Río Bueno', 'Valdivia'],
  'Los Lagos': ['Ancud', 'Calbuco', 'Castro', 'Chaitén', 'Chonchi', 'Cochamó', 'Curaco de Vélez', 'Dalcahue', 'Fresia', 'Frutillar', 'Futaleufú', 'Hualaihué', 'Llanquihue', 'Los Muermos', 'Maullín', 'Osorno', 'Palena', 'Puerto Montt', 'Puerto Octay', 'Puerto Varas', 'Puqueldón', 'Purranque', 'Puyehue', 'Queilén', 'Quellón', 'Quemchi', 'Quinchao', 'Río Negro', 'San Juan de la Costa', 'San Pablo'],
  'Aysén del General Carlos Ibáñez del Campo': ['Aysén', 'Chile Chico', 'Cisnes', 'Cochrane', 'Coyhaique', 'Guaitecas', 'Lago Verde', "O'Higgins", 'Río Ibáñez', 'Tortel'],
  'Magallanes y de la Antártica Chilena': ['Antártica', 'Cabo de Hornos', 'Laguna Blanca', 'Natales', 'Porvenir', 'Primavera', 'Punta Arenas', 'Río Verde', 'San Gregorio', 'Timaukel', 'Torres del Paine'],
};

function normalizeSortText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

function formatRut(value: string): string {
  const clean = value.toUpperCase().replace(/[^0-9K]/g, '').slice(0, 9);
  if (clean.length <= 7) {
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${verifier}`;
}

function formatChileMobile(value: string): string {
  let clean = value.replace(/\D/g, '');
  if (!clean || '569'.startsWith(clean)) return '+569';
  if (clean.startsWith('569')) clean = clean.slice(3);
  if (clean.startsWith('9')) clean = clean.slice(1);
  return `+569${clean.slice(0, 8)}`;
}

function phoneForSubmit(value: string): string {
  return value === '+569' ? '' : value;
}

export function PatientsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyPatient);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('full_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const canUploadTxt = user?.role === 'Admin';
  const communesForSelectedRegion = form.region ? CHILE_COMMUNES_BY_REGION[form.region] ?? [] : [];

  const sortedPatients = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...patients].sort((a, b) => {
      if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;
      const rootA = a.root_patient_id || a.id;
      const rootB = b.root_patient_id || b.id;
      if (rootA === rootB) return a.ficha_number - b.ficha_number;

      if (sortKey === 'ficha_number') {
        return (a.ficha_number - b.ficha_number || a.full_name.localeCompare(b.full_name, 'es')) * direction;
      }
      if (sortKey === 'current_stage') {
        const stageCompare = STAGE_ORDER.indexOf(normalizeSortText(a.current_stage)) - STAGE_ORDER.indexOf(normalizeSortText(b.current_stage));
        return (stageCompare || a.full_name.localeCompare(b.full_name, 'es')) * direction;
      }
      if (sortKey === 'rut') {
        const rutA = a.rut.replace(/[^0-9K]/gi, '');
        const rutB = b.rut.replace(/[^0-9K]/gi, '');
        return (rutA.localeCompare(rutB, 'es', { numeric: true }) || a.full_name.localeCompare(b.full_name, 'es')) * direction;
      }
      return (a.full_name.localeCompare(b.full_name, 'es', { sensitivity: 'base' }) || a.rut.localeCompare(b.rut, 'es')) * direction;
    });
  }, [patients, sortDirection, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortDirection === 'asc' ? 'Asc' : 'Desc') : 'Orden');

  const load = async () => {
    setPatients(await patientsApi.list(query.trim() || undefined, undefined, true));
  };

  useEffect(() => {
    const handle = window.setTimeout(() => load().catch((err) => setMessage(err instanceof Error ? err.message : 'Error')), 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const createPatient = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      await patientsApi.create({
        ...form,
        age: Number(form.age),
        phone: phoneForSubmit(form.phone),
        trusted_contact_phone: phoneForSubmit(form.trusted_contact_phone),
      });
      setForm(emptyPatient);
      await load();
      setMessage('Paciente creado en etapa Dosimetría.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo crear paciente');
    }
  };

  const handleRutChange = (value: string) => {
    setForm({ ...form, rut: formatRut(value) });
  };

  const handlePhoneChange = (field: 'phone' | 'trusted_contact_phone', value: string) => {
    setForm({ ...form, [field]: formatChileMobile(value) });
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canUploadTxt) return;
    setUploading(true);
    setMessage('');
    try {
      const result = await patientsApi.uploadTxt(file);
      setMessage(`Carga lista: ${result.inserted} insertados, ${result.skipped} omitidos. ${result.errors.length ? 'Con errores.' : ''}`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo cargar el archivo');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="patients-page">
      <div className="page-header">
        <div>
          <h1>Pacientes</h1>
          <p>Búsqueda, revisión y creación manual de pacientes.</p>
        </div>
        {canUploadTxt && (
          <label className="upload-button">
            {uploading ? 'Cargando...' : 'Cargar TXT'}
            <input type="file" accept=".txt" onChange={handleUpload} disabled={uploading} />
          </label>
        )}
      </div>

      {message && <div className="info-banner">{message}</div>}

      <div className="admin-grid">
        <section className="panel">
          <div className="panel-title">
            <span className="circle-icon">＋</span>
            <h2>Crear paciente</h2>
          </div>
          <form className="user-form" onSubmit={createPatient}>
            <label>
              RUT
              <input
                required
                inputMode="text"
                maxLength={12}
                placeholder="12.345.678-9"
                value={form.rut}
                onChange={(event) => handleRutChange(event.target.value)}
              />
            </label>
            <label>Nombre completo<input required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
            <label>
              Sexo
              <select required value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })}>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </label>
            <label>Edad<input required type="number" min={0} max={130} value={form.age} onChange={(event) => setForm({ ...form, age: Number(event.target.value) })} /></label>
            <label>
              Teléfono
              <input
                inputMode="numeric"
                maxLength={12}
                value={form.phone}
                onChange={(event) => handlePhoneChange('phone', event.target.value)}
              />
            </label>
            <label>
              Teléfono confianza
              <input
                inputMode="numeric"
                maxLength={12}
                value={form.trusted_contact_phone}
                onChange={(event) => handlePhoneChange('trusted_contact_phone', event.target.value)}
              />
            </label>
            <label>
              Región
              <select value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value, commune: '' })}>
                <option value="">Seleccionar región</option>
                {CHILE_REGIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </label>
            <label>
              Comuna
              <select
                value={form.commune}
                onChange={(event) => setForm({ ...form, commune: event.target.value })}
                disabled={!form.region}
              >
                <option value="">{form.region ? 'Seleccionar comuna' : 'Selecciona una región primero'}</option>
                {communesForSelectedRegion.map((commune) => (
                  <option key={commune} value={commune}>{commune}</option>
                ))}
              </select>
            </label>
            <label>Calle<input value={form.street} onChange={(event) => setForm({ ...form, street: event.target.value })} /></label>
            <button className="primary-button">Crear paciente</button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-title panel-title-between">
            <div>
              <span className="circle-icon">⌕</span>
              <h2>Buscar pacientes</h2>
            </div>
          </div>
          <div className="search-box standalone-search">
            <span>⌕</span>
            <input placeholder="RUT o nombre" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="table-wrapper">
            <table className="workflow-table">
              <thead>
                <tr>
                  <th><SortButton label="Paciente" activeLabel={sortIndicator('full_name')} onClick={() => toggleSort('full_name')} /></th>
                  <th><SortButton label="RUT" activeLabel={sortIndicator('rut')} onClick={() => toggleSort('rut')} /></th>
                  <th><SortButton label="Ficha" activeLabel={sortIndicator('ficha_number')} onClick={() => toggleSort('ficha_number')} /></th>
                  <th><SortButton label="Etapa" activeLabel={sortIndicator('current_stage')} onClick={() => toggleSort('current_stage')} /></th>
                  <th>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {sortedPatients.map((patient) => (
                  <tr key={patient.id} className={patient.is_priority ? 'priority-row' : ''}>
                    <td>
                      <strong>{patient.full_name}</strong>
                    </td>
                    <td>{patient.rut}</td>
                    <td><span className="ficha-badge">{patient.ficha_label}</span></td>
                    <td><span className="stage-pill">{patient.current_stage}</span></td>
                    <td>{patient.phone}</td>
                  </tr>
                ))}
                {sortedPatients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-cell">No se encontraron pacientes.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function SortButton({ label, activeLabel, onClick }: { label: string; activeLabel: string; onClick: () => void }) {
  return (
    <button type="button" className="sort-header-button" onClick={onClick}>
      <span>{label}</span>
      <span className="sort-header-indicator">{activeLabel}</span>
    </button>
  );
}
