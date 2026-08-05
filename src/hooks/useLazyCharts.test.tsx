import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render } from '@testing-library/react';
import { useLazyCharts } from './useLazyCharts';

// jsdom no tiene IntersectionObserver: lo simulamos para poder controlar
// cuándo "entra en el viewport".
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: (entries: { isIntersecting: boolean }[]) => void;
  observed: Element | null = null;

  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed = el;
  }
  disconnect() {}
  unobserve() {}
  trigger(intersecting: boolean) {
    this.callback([{ isIntersecting: intersecting }]);
  }
}

vi.mock('recharts', () => ({ BarChart: 'MockBarChart', Tooltip: 'MockTooltip' }));

describe('useLazyCharts', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    // jsdom no implementa IntersectionObserver: exponemos el mock global.
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('con enabled=false nunca importa recharts', async () => {
    const importSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useLazyCharts(false));

    expect(result.current.charts).toBeNull();
    expect(result.current.error).toBe(false);

    // Esperar microtasks: si hubiera importado, charts ya no sería null.
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.charts).toBeNull();
    expect(importSpy).not.toHaveBeenCalled();
    importSpy.mockRestore();
  });

  it('sin ref disponible (vista en carga) carga inmediatamente', async () => {
    const { result } = renderHook(() => useLazyCharts(true));

    expect(result.current.charts).toBeNull();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(result.current.charts).not.toBeNull();
    expect(result.current.charts?.BarChart).toBe('MockBarChart');
  });

  it('con ref adjunto observa y solo importa al intersectar', async () => {
    function Test() {
      const { charts, containerRef } = useLazyCharts(true);
      return <div ref={containerRef}>{charts ? 'loaded' : 'pending'}</div>;
    }
    const { container } = render(<Test />);
    expect(container.textContent).toBe('pending');
    expect(MockIntersectionObserver.instances).toHaveLength(1);

    // Aún sin intersección → no importa
    await new Promise((r) => setTimeout(r, 20));
    expect(container.textContent).toBe('pending');

    // Al intersectar → importa y renderiza
    await act(async () => {
      MockIntersectionObserver.instances[0].trigger(true);
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(container.textContent).toBe('loaded');
  });

  it('no re-importa una vez cargado (charts ya presente)', async () => {
    const { result, rerender } = renderHook(() => useLazyCharts(true));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    const loaded = result.current.charts;
    expect(loaded).not.toBeNull();

    rerender();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(result.current.charts).toBe(loaded);
  });
});
