import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmpleadosView from './EmpleadosView';
import { api } from '../../services/api';
import type { Employee } from '../../types';

vi.mock('../../services/api', () => ({
  api: {
    getEmployees: vi.fn(),
    setEmployeePassword: vi.fn(),
    deleteEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    createEmployee: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api, true);

const employee: Employee = {
  id: 'emp-1',
  nombre: 'Ana Torres',
  role: 'OPERATOR',
  locationId: 'nemocon',
  activo: true,
  creado: '2026-01-01T00:00:00.000Z',
  username: 'ana.torres',
  email: 'ana.torres@juanchospizza.com',
  isSuperAdmin: false,
};

describe('EmpleadosView password reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getEmployees.mockResolvedValue([employee]);
  });

  const openModal = async () => {
    render(<EmpleadosView />);
    await screen.findByText('Ana Torres');
    fireEvent.click(screen.getByTestId(`reset-password-trigger-${employee.id}`));
    return screen.getByTestId('reset-password-input');
  };

  it('rejects a password shorter than 10 characters', async () => {
    const input = await openModal();
    fireEvent.change(input, { target: { value: 'ab1' } });
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    expect(await screen.findByTestId('reset-password-error')).toHaveTextContent(
      'Mínimo 10 caracteres, con al menos una letra y un número.'
    );
    expect(mockedApi.setEmployeePassword).not.toHaveBeenCalled();
  });

  it('rejects a password with no letter', async () => {
    const input = await openModal();
    fireEvent.change(input, { target: { value: '1234567890' } });
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    expect(await screen.findByTestId('reset-password-error')).toBeInTheDocument();
    expect(mockedApi.setEmployeePassword).not.toHaveBeenCalled();
  });

  it('rejects a password with no digit', async () => {
    const input = await openModal();
    fireEvent.change(input, { target: { value: 'abcdefghij' } });
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    expect(await screen.findByTestId('reset-password-error')).toBeInTheDocument();
    expect(mockedApi.setEmployeePassword).not.toHaveBeenCalled();
  });

  it('accepts a valid password, calls the api, and clears the modal state', async () => {
    mockedApi.setEmployeePassword.mockResolvedValue(undefined);
    const input = await openModal();
    fireEvent.change(input, { target: { value: 'goodpass123' } });
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    await waitFor(() => expect(mockedApi.setEmployeePassword).toHaveBeenCalledWith('emp-1', 'goodpass123'));
    // Modal closes -- resetPasswordEmp state is cleared on success.
    await waitFor(() => expect(screen.queryByTestId('reset-password-input')).not.toBeInTheDocument());
  });

  it('shows an error message when the api call fails', async () => {
    mockedApi.setEmployeePassword.mockRejectedValue(new Error('El empleado ya no existe'));
    const input = await openModal();
    fireEvent.change(input, { target: { value: 'goodpass123' } });
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    expect(await screen.findByTestId('reset-password-error')).toHaveTextContent('El empleado ya no existe');
  });
});

describe('EmpleadosView generador y antigüedad de contraseña', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('el botón Generar llena la contraseña y se puede enviar sin escribirla', async () => {
    mockedApi.getEmployees.mockResolvedValue([employee]);
    mockedApi.setEmployeePassword.mockResolvedValue(undefined);
    render(<EmpleadosView />);
    await screen.findByText('Ana Torres');
    fireEvent.click(screen.getByTestId(`reset-password-trigger-${employee.id}`));
    fireEvent.click(screen.getByTestId('reset-password-generate'));

    const input = screen.getByTestId('reset-password-input') as HTMLInputElement;
    expect(input.type).toBe('text'); // visible para poder copiarla
    expect(input.value).toMatch(/^(?=.*[a-zA-Z])(?=.*\d).{16}$/);

    fireEvent.click(screen.getByTestId('reset-password-submit'));
    await waitFor(() => expect(mockedApi.setEmployeePassword).toHaveBeenCalledWith(employee.id, input.value));
  });

  it('marca como vencida una contraseña de más de 90 días', async () => {
    const old = new Date(Date.now() - 120 * 86_400_000).toISOString();
    mockedApi.getEmployees.mockResolvedValue([{ ...employee, tienePassword: true, passwordChangedAt: old }]);
    render(<EmpleadosView />);
    await screen.findByText('Ana Torres');
    expect(screen.getByTestId(`password-age-${employee.id}`)).toHaveTextContent('hace 120 días · VENCIDA, rotar');
  });

  it('avisa cuando la cuenta no tiene contraseña', async () => {
    mockedApi.getEmployees.mockResolvedValue([{ ...employee, tienePassword: false, passwordChangedAt: null }]);
    render(<EmpleadosView />);
    await screen.findByText('Ana Torres');
    expect(screen.getByTestId(`password-age-${employee.id}`)).toHaveTextContent('Sin contraseña');
  });

  it('crear empleado: exige contraseña válida y la envía sin PIN', async () => {
    mockedApi.getEmployees.mockResolvedValue([]);
    mockedApi.createEmployee.mockResolvedValue({});
    render(<EmpleadosView />);
    await screen.findByText(/Sin empleados registrados/);
    fireEvent.click(screen.getByText('NUEVO EMPLEADO'));
    fireEvent.change(screen.getByPlaceholderText('Nombre completo'), { target: { value: 'Caja' } });
    fireEvent.change(screen.getByPlaceholderText('empleado@gmail.com'), {
      target: { value: 'caja@juanchospizza.com' },
    });

    fireEvent.change(screen.getByTestId('create-password-input'), { target: { value: 'corta1' } });
    fireEvent.click(screen.getByText('Crear Empleado'));
    expect(mockedApi.createEmployee).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('create-password-generate'));
    fireEvent.click(screen.getByText('Crear Empleado'));
    await waitFor(() => expect(mockedApi.createEmployee).toHaveBeenCalledTimes(1));
    const payload = mockedApi.createEmployee.mock.calls[0][0];
    expect(payload).toMatchObject({ nombre: 'Caja', role: 'OPERATOR', email: 'caja@juanchospizza.com' });
    expect(payload.password).toMatch(/^(?=.*[a-zA-Z])(?=.*\d).{16}$/);
    expect('pin' in payload).toBe(false);
  });
});
