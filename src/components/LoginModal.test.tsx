import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginModal from './LoginModal';
import { __resetBodyScrollLockForTests } from '../utils/useBodyScrollLock';

describe('LoginModal', () => {
  afterEach(() => {
    __resetBodyScrollLockForTests();
  });

  const fillIdentifier = (value: string) => {
    fireEvent.change(screen.getByLabelText('Correo o usuario'), { target: { value } });
  };
  const fillPassword = (value: string) => {
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value } });
  };
  const submit = () => {
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
  };

  it('shows a validation error on empty submit and does not call onLogin', async () => {
    const onLogin = vi.fn();
    render(<LoginModal onLogin={onLogin} onLoginGoogle={vi.fn()} onClose={vi.fn()} />);

    submit();

    expect(await screen.findByText('Ingresa tu correo (o usuario) y contraseña')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('does not call onLogin when identifier is filled but password is empty', async () => {
    const onLogin = vi.fn();
    render(<LoginModal onLogin={onLogin} onLoginGoogle={vi.fn()} onClose={vi.fn()} />);

    fillIdentifier('nuevo.empleado@juanchospizza.com');
    submit();

    expect(await screen.findByText('Ingresa tu correo (o usuario) y contraseña')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('submits email + password', async () => {
    const onLogin = vi.fn().mockResolvedValue(true);
    render(<LoginModal onLogin={onLogin} onLoginGoogle={vi.fn()} onClose={vi.fn()} />);

    fillIdentifier('nuevo.empleado@juanchospizza.com');
    fillPassword('secreta123');
    submit();

    await waitFor(() =>
      expect(onLogin).toHaveBeenCalledWith('nuevo.empleado@juanchospizza.com', 'secreta123')
    );
  });

  it('submits a bare username + password (cuentas de terminal)', async () => {
    const onLogin = vi.fn().mockResolvedValue(true);
    render(<LoginModal onLogin={onLogin} onLoginGoogle={vi.fn()} onClose={vi.fn()} />);

    fillIdentifier('cocina');
    fillPassword('secreta123');
    submit();

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('cocina', 'secreta123'));
  });

  it('shows no error after a successful login', async () => {
    const onLogin = vi.fn().mockResolvedValue(true);
    render(<LoginModal onLogin={onLogin} onLoginGoogle={vi.fn()} onClose={vi.fn()} />);

    fillIdentifier('admin@juanchospizza.com');
    fillPassword('secreta123');
    submit();

    await waitFor(() => expect(onLogin).toHaveBeenCalled());
    expect(screen.queryByText(/credenciales incorrectas/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Ingresa tu correo (o usuario) y contraseña')).not.toBeInTheDocument();
  });

  it('shows "Credenciales incorrectas" when onLogin resolves false', async () => {
    const onLogin = vi.fn().mockResolvedValue(false);
    render(<LoginModal onLogin={onLogin} onLoginGoogle={vi.fn()} onClose={vi.fn()} />);

    fillIdentifier('admin@juanchospizza.com');
    fillPassword('mala');
    submit();

    expect(await screen.findByText('Credenciales incorrectas')).toBeInTheDocument();
  });

  it('propagates the error message from a rejected onLogin', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('No se pudo conectar con el servidor'));
    render(<LoginModal onLogin={onLogin} onLoginGoogle={vi.fn()} onClose={vi.fn()} />);

    fillIdentifier('admin@juanchospizza.com');
    fillPassword('secreta123');
    submit();

    expect(await screen.findByText('No se pudo conectar con el servidor')).toBeInTheDocument();
  });
});
