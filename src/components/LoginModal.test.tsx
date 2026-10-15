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

<<<<<<< HEAD
    expect(await screen.findByText('Ingresa tu correo (o usuario) y contraseña')).toBeInTheDocument();
=======
<<<<<<< HEAD
    expect(await screen.findByText('Ingresa tu correo (o usuario) y tu contraseña')).toBeInTheDocument();
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
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

<<<<<<< HEAD
  it('submits a bare username + password (cuentas de terminal)', async () => {
=======
  it('submits with username + password (terminal accounts like cocina)', async () => {
=======
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
>>>>>>> 9446794 (Add dine-in/delivery orderType and mesa; persist to CRM; fix auth seed force-reset; update WhatsApp builder and CartDrawer)
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
    const onLogin = vi.fn().mockResolvedValue(true);
    render(<LoginModal onLogin={onLogin} onLoginGoogle={vi.fn()} onClose={vi.fn()} />);

    fillIdentifier('cocina');
<<<<<<< HEAD
    fillPassword('secreta123');
    submit();

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('cocina', 'secreta123'));
=======
<<<<<<< HEAD
    fillPassword('DY6tT9TSRfWk');
    submit();

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('cocina', 'DY6tT9TSRfWk'));
=======
    fillPassword('secreta123');
    submit();

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('cocina', 'secreta123'));
>>>>>>> 9446794 (Add dine-in/delivery orderType and mesa; persist to CRM; fix auth seed force-reset; update WhatsApp builder and CartDrawer)
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
  });

  it('shows no error after a successful login', async () => {
    const onLogin = vi.fn().mockResolvedValue(true);
    render(<LoginModal onLogin={onLogin} onLoginGoogle={vi.fn()} onClose={vi.fn()} />);

<<<<<<< HEAD
    fillIdentifier('admin@juanchospizza.com');
    fillPassword('secreta123');
=======
<<<<<<< HEAD
    fillIdentifier('juanchospizzanz@gmail.com');
    fillPassword('DY6tT9TSRfWk');
=======
    fillIdentifier('admin@juanchospizza.com');
    fillPassword('secreta123');
>>>>>>> 9446794 (Add dine-in/delivery orderType and mesa; persist to CRM; fix auth seed force-reset; update WhatsApp builder and CartDrawer)
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
    submit();

    await waitFor(() => expect(onLogin).toHaveBeenCalled());
    expect(screen.queryByText(/credenciales incorrectas/i)).not.toBeInTheDocument();
<<<<<<< HEAD
    expect(screen.queryByText('Ingresa tu correo (o usuario) y contraseña')).not.toBeInTheDocument();
=======
<<<<<<< HEAD
    expect(screen.queryByText('Ingresa tu correo (o usuario) y tu contraseña')).not.toBeInTheDocument();
=======
    expect(screen.queryByText('Ingresa tu correo (o usuario) y contraseña')).not.toBeInTheDocument();
>>>>>>> 9446794 (Add dine-in/delivery orderType and mesa; persist to CRM; fix auth seed force-reset; update WhatsApp builder and CartDrawer)
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
  });

  it('shows "Credenciales incorrectas" when onLogin resolves false', async () => {
    const onLogin = vi.fn().mockResolvedValue(false);
    render(<LoginModal onLogin={onLogin} onLoginGoogle={vi.fn()} onClose={vi.fn()} />);

<<<<<<< HEAD
    fillIdentifier('admin@juanchospizza.com');
    fillPassword('mala');
=======
<<<<<<< HEAD
    fillIdentifier('juanchospizzanz@gmail.com');
    fillPassword('wrongpassword1');
=======
    fillIdentifier('admin@juanchospizza.com');
    fillPassword('mala');
>>>>>>> 9446794 (Add dine-in/delivery orderType and mesa; persist to CRM; fix auth seed force-reset; update WhatsApp builder and CartDrawer)
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
    submit();

    expect(await screen.findByText('Credenciales incorrectas')).toBeInTheDocument();
  });

  it('propagates the error message from a rejected onLogin', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('No se pudo conectar con el servidor'));
    render(<LoginModal onLogin={onLogin} onLoginGoogle={vi.fn()} onClose={vi.fn()} />);

<<<<<<< HEAD
    fillIdentifier('admin@juanchospizza.com');
    fillPassword('secreta123');
=======
<<<<<<< HEAD
    fillIdentifier('juanchospizzanz@gmail.com');
    fillPassword('DY6tT9TSRfWk');
=======
    fillIdentifier('admin@juanchospizza.com');
    fillPassword('secreta123');
>>>>>>> 9446794 (Add dine-in/delivery orderType and mesa; persist to CRM; fix auth seed force-reset; update WhatsApp builder and CartDrawer)
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
    submit();

    expect(await screen.findByText('No se pudo conectar con el servidor')).toBeInTheDocument();
  });
});
