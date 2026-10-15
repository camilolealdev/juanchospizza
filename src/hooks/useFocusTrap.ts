import { useEffect } from 'react';

export function useFocusTrap(isOpen: boolean, onClose: () => void, autoFocusSelector?: string) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const modal = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
      if (!modal) return;
      const focusables = modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    if (autoFocusSelector) {
      const id = window.setTimeout(() => {
        const el = document.querySelector<HTMLElement>(autoFocusSelector);
        el?.focus();
      }, 50);
      return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        window.clearTimeout(id);
      };
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose, autoFocusSelector]);
}
