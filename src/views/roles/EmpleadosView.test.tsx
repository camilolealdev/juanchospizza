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
