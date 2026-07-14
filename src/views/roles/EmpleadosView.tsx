import React, { useEffect, useState } from 'react';
import { Employee } from '../../types';
import { api } from '../../services/api';

const ROLE_LABELS: Record<Employee['role'], string> = {
  ADMIN: 'Administrador',
  OPERATOR: 'Cocina',
  REPARTIDOR: 'Repartidor',
  MARKETING: 'Marketing',
};

const LOCATION_LABELS: Record<'nemocon' | 'zipaquira', string> = {
  nemocon: 'Nemocón',
  zipaquira: 'Zipaquirá',
};

type FormState = { nombre: string; role: Employee['role']; locationId: '' | 'nemocon' | 'zipaquira'; pin: string };

const emptyForm: FormState = { nombre: '', role: 'OPERATOR', locationId: '', pin: '' };

// Roster CRUD only -- creating/editing an employee here does NOT create a
// working login. server/routes/auth.js still only checks the 4-entry USERS
// array in server/auth.js; wiring this table into the real login flow is
// future work (see server/db.js employees table comment).
const EmpleadosView: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadEmployees = () => {
    setLoading(true);
    api
      .getEmployees()
      .then(setEmployees)
      .catch((e) => showToast(`Error cargando empleados: ${e instanceof Error ? e.message : 'error desconocido'}`))
      .finally(() => setLoading(false));
  };

  // loadEmployees is redefined every render (not memoized) -- including it
  // would refire this on every render instead of once on mount.

  useEffect(() => {
    loadEmployees();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };
  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({ nombre: emp.nombre, role: emp.role, locationId: emp.locationId || '', pin: '' });
    setShowModal(true);
  };

  const handleDelete = async (emp: Employee) => {
    if (!window.confirm(`¿Eliminar a ${emp.nombre} del roster? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteEmployee(emp.id);
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
      showToast('Empleado eliminado.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error eliminando el empleado.');
    }
  };

  const handleToggleActivo = async (emp: Employee) => {
    const nextActivo = !emp.activo;
    // Optimistic update, reverted below if the request fails.
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, activo: nextActivo } : e)));
    try {
      await api.updateEmployee(emp.id, { activo: nextActivo });
    } catch (e) {
      setEmployees((prev) => prev.map((x) => (x.id === emp.id ? { ...x, activo: emp.activo } : x)));
      showToast(e instanceof Error ? e.message : 'No se pudo actualizar el estado.');
    }
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return;
    try {
      if (editingId) {
        await api.updateEmployee(editingId, {
          nombre: form.nombre,
          role: form.role,
          locationId: form.locationId || null,
        });
        showToast('Empleado actualizado.');
      } else {
        if (!/^\d{4}$/.test(form.pin)) {
          showToast('El PIN debe ser de 4 dígitos.');
          return;
        }
        await api.createEmployee({
          nombre: form.nombre,
          role: form.role,
          pin: form.pin,
          locationId: form.locationId || undefined,
        });
        showToast('Empleado registrado.');
      }
      setShowModal(false);
      loadEmployees();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error guardando el empleado.');
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[50vh] text-stone-500">
        <i className="fas fa-spinner fa-spin text-3xl mr-4"></i>
        <span className="font-bold uppercase tracking-widest text-sm">Cargando empleados...</span>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-12 pb-40">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-brand">Empleados</h1>
          <p className="text-stone-500 mt-4 max-w-xl">
            Roster de staff de Juancho&rsquo;s Pizza. Registro de quién está en planta por sede y rol -- todavía no
            conectado al login real.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-orange-600 hover:bg-orange-500 px-10 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4 w-full md:w-auto justify-center"
        >
          <i className="fas fa-plus"></i> NUEVO EMPLEADO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="bg-stone-900/60 p-8 rounded-[3.5rem] border border-stone-800 hover:border-orange-500/40 transition-all group relative overflow-hidden"
          >
            <div
              className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 ${emp.activo ? 'bg-green-500' : 'bg-stone-500'}`}
            ></div>
            <div className="flex justify-between items-start mb-8">
              <span
                className={`text-[8px] font-black uppercase px-5 py-2 rounded-full border ${
                  emp.activo
                    ? 'bg-green-950 text-green-500 border-green-500/20'
                    : 'bg-stone-800 text-stone-500 border-stone-700'
                }`}
              >
                {emp.activo ? 'Activo' : 'Inactivo'}
              </span>
              <div className="flex items-center gap-4">
                <button onClick={() => openEdit(emp)} className="text-stone-700 hover:text-white transition-colors">
                  <i className="fas fa-pen"></i>
                </button>
                <button
                  onClick={() => handleDelete(emp)}
                  className="text-stone-700 hover:text-red-500 transition-colors"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <h4 className="font-black text-xl mb-3 tracking-tight">{emp.nombre}</h4>
            <p className="text-stone-500 text-[10px] mb-8 uppercase tracking-[0.3em] font-bold italic">
              {ROLE_LABELS[emp.role] || emp.role}
            </p>

            <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-8">
              <div>
                <p className="text-[9px] text-stone-600 uppercase font-black tracking-widest mb-1">Sede</p>
                <p className="text-lg font-black text-white">
                  {emp.locationId ? LOCATION_LABELS[emp.locationId] : 'Sin asignar'}
                </p>
              </div>
              <button
                onClick={() => handleToggleActivo(emp)}
                className="text-left"
                title={emp.activo ? 'Marcar como inactivo' : 'Marcar como activo'}
              >
                <p className="text-[9px] text-stone-600 uppercase font-black tracking-widest mb-1">Estado</p>
                <p className={`text-lg font-black ${emp.activo ? 'text-green-500' : 'text-stone-500'}`}>
                  {emp.activo ? 'Desactivar' : 'Reactivar'}
                </p>
              </button>
            </div>
          </div>
        ))}
        {employees.length === 0 && (
          <p className="text-stone-600 text-sm col-span-full">
            Sin empleados registrados todavía. Creá el primero con &ldquo;Nuevo Empleado&rdquo;.
          </p>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-stone-900 p-10 rounded-[3rem] border border-stone-700 shadow-2xl max-w-lg w-full mx-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-brand mb-8">{editingId ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-2">
                  Nombre
                </label>
                <input
                  className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-2">
                    Rol
                  </label>
                  <select
                    className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:border-orange-500 transition-colors"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Employee['role'] })}
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="OPERATOR">Cocina</option>
                    <option value="REPARTIDOR">Repartidor</option>
                    <option value="MARKETING">Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-2">
                    Sede
                  </label>
                  <select
                    className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:border-orange-500 transition-colors"
                    value={form.locationId}
                    onChange={(e) => setForm({ ...form, locationId: e.target.value as FormState['locationId'] })}
                  >
                    <option value="">Sin asignar</option>
                    <option value="nemocon">Nemocón</option>
                    <option value="zipaquira">Zipaquirá</option>
                  </select>
                </div>
              </div>
              {!editingId && (
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-2">
                    PIN (4 dígitos)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:border-orange-500 transition-colors"
                    value={form.pin}
                    onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                    placeholder="••••"
                  />
                  <p className="text-stone-600 text-[10px] mt-2">
                    Este PIN todavía no habilita el login real -- solo queda registrado en el roster.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-4 mt-10">
              <button
                className="px-8 py-4 rounded-2xl border border-stone-700 text-xs font-black uppercase tracking-widest text-stone-500 hover:border-stone-500 transition-colors"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="px-8 py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-xs font-black uppercase tracking-widest transition-colors shadow-xl"
                onClick={handleSubmit}
              >
                {editingId ? 'Guardar' : 'Crear Empleado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 border border-stone-700 px-6 py-3 rounded-2xl shadow-2xl z-50 text-sm font-bold">
          {toast}
        </div>
      )}
    </div>
  );
};

export default EmpleadosView;
