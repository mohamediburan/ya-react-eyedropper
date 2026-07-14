import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEyeDropper } from '../useEyeDropper';

describe('useEyeDropper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with idle status', () => {
    const { result } = renderHook(() => useEyeDropper());
    expect(result.current.status).toBe('idle');
    expect(result.current.isPicking).toBe(false);
    expect(result.current.activeStrategy).toBe(null);
  });

  it('should report isSupported true by default (auto chain includes canvas)', () => {
    const { result } = renderHook(() => useEyeDropper());
    expect(result.current.isSupported).toBe(true);
  });

  it('should successfully pick a color via native strategy', async () => {
    const { result } = renderHook(() => useEyeDropper({ strategy: 'native' }));

    let color: any;
    await act(async () => {
      color = await result.current.open();
    });

    expect(color.hex).toBe('#ff0000');
    expect(result.current.status).toBe('idle');
    expect(result.current.activeStrategy).toBe('native');
  });

  it('should fallback properly if native is not supported', async () => {
    const originalEyeDropper = (window as any).EyeDropper;
    delete (window as any).EyeDropper;

    const { result } = renderHook(() => useEyeDropper({ strategy: 'native' }));
    
    expect(result.current.isSupported).toBe(false);

    (window as any).EyeDropper = originalEyeDropper;
  });
});
