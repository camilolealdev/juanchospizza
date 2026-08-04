import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginModal from './LoginModal';
import { __resetBodyScrollLockForTests } from '../utils/useBodyScrollLock';

describe('LoginModal', () => {
  afterEach(() => {
    __resetBodyScrollLockForTests();
  });

  const fillUsername = (value: string) => {
    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value } });
  };
  const fillPin = (value: string) => {
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value } });
  };
  const submit = () => {
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
  };

  it('shows a validation error on empty submit and does not call onLogin', async () => {
    const onLogin = vi.fn();
    render(<LoginModal onLogin={onLogin} onClose={vi.fn()} />);

    submit();

    expect(await screen.findByText('Ingresa tu usuario y el PIN o la contraseña')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('does not call onLogin when username is filled but neither pin nor password is', async () => {
    const onLogin = vi.fn();
    render(<LoginModal onLogin={onLogin} onClose={vi.fn()} />);

    fillUsername('nuevo.empleado');
    submit();

    expect(await screen.findByText('Ingresa tu usuario y el PIN o la contraseña')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('submits with username + pin only, leaving password undefined (password is optional)', async () => {
    const onLogin = vi.fn().mockResolvedValue(true);
    render(<LoginModal onLogin={onLogin} onClose={vi.fn()} />);

    fillUsername('nuevo.empleado');
    fillPin('1234');
    submit();

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('nuevo.empleado', '1234', undefined));
  });

  it('shows no error after a successful login', async () => {
    const onLogin = vi.fn().mockResolvedValue(true);
    render(<LoginModal onLogin={onLogin} onClose={vi.fn()} />);

    fillUsername('nuevo.empleado');
    fillPin('1234');
    submit();

    await waitFor(() => expect(onLogin).toHaveBeenCalled());
    expect(screen.queryByText(/credenciales incorrectas/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Ingresa tu usuario y el PIN o la contraseña')).not.toBeInTheDocument();
  });

  it('shows "Credenciales incorrectas" when onLogin resolves false', async () => {
    const onLogin = vi.fn().mockResolvedValue(false);
    render(<LoginModal onLogin={onLogin} onClose={vi.fn()} />);

    fillUsername('nuevo.empleado');
    fillPin('9999');
    submit();

    expect(await screen.findByText('Credenciales incorrectas')).toBeInTheDocument();
  });

  it('propagates the error message from a rejected onLogin', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('No se pudo conectar con el servidor'));
    render(<LoginModal onLogin={onLogin} onClose={vi.fn()} />);

    fillUsername('nuevo.empleado');
    fillPin('1234');
    submit();

    expect(await screen.findByText('No se pudo conectar con el servidor')).toBeInTheDocument();
  });
});
