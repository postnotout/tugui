import { useCallback, useRef, useEffect } from 'react';
import { synth, type SoundId } from '../utils/soundSynth';

export type { SoundId };

// Stable play() function — settings changes reflected immediately via ref
export function useSound(enabled: boolean, volume: number) {
  const ctxRef = useRef<AudioContext | null>(null);
  const settingsRef = useRef({ enabled, volume });

  useEffect(() => {
    settingsRef.current = { enabled, volume };
  }, [enabled, volume]);

  const play = useCallback((id: SoundId) => {
    const { enabled, volume } = settingsRef.current;
    if (!enabled) return;
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => synth(ctx, id, volume)).catch(() => {});
      } else {
        synth(ctx, id, volume);
      }
    } catch {
      // AudioContext unavailable (SSR / sandboxed environment)
    }
  }, []);

  return play;
}
