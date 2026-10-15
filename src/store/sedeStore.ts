import { create } from 'zustand';

type Sede = 'nemocon' | 'zipaquira';

interface SedeState {
  sede: Sede;
  setSede: (sede: Sede) => void;
}

function loadSede(): Sede {
  try {
    const saved = sessionStorage.getItem('juanchos_sede');
    if (saved === 'nemocon' || saved === 'zipaquira') return saved;
  } catch {
    // sessionStorage no disponible (SSR, modo privado) — usar default
  }
  return 'nemocon';
}

export const useSedeStore = create<SedeState>((set) => ({
  sede: loadSede(),
  setSede: (sede) => {
    sessionStorage.setItem('juanchos_sede', sede);
    set({ sede });
  },
}));
