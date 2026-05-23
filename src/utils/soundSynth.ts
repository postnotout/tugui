// 8-bit procedural sound synthesis — Web Audio API, no files needed
export type SoundId = 'click' | 'correct' | 'incorrect' | 'combo' | 'levelup' | 'gameover' | 'ending' | 'tick';

type NoteSpec = [freq: number, dur: number, vol?: number, type?: OscillatorType];

function tone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  dur: number,
  vol: number,
  type: OscillatorType,
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  g.gain.setValueAtTime(vol, startTime);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + dur + 0.02);
}

function seq(ctx: AudioContext, notes: NoteSpec[], masterVol: number) {
  let t = ctx.currentTime + 0.01;
  for (const [f, d, v = 0.5, type = 'square'] of notes) {
    tone(ctx, f, t, d, v * masterVol, type);
    t += d;
  }
}

const N = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  Ab4: 415.30, A4: 440.00, Bb4: 466.16,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
  C6: 1046.50, D6: 1174.66, E6: 1318.51,
};

export function synth(ctx: AudioContext, id: SoundId, vol: number) {
  switch (id) {
    case 'click':
      seq(ctx, [[900, 0.04, 0.2]], vol);
      break;

    case 'tick':
      seq(ctx, [[660, 0.05, 0.15]], vol);
      break;

    case 'correct':
      seq(ctx, [
        [N.C5, 0.07],
        [N.E5, 0.07],
        [N.G5, 0.07],
        [N.C6, 0.18, 0.65],
      ], vol);
      break;

    case 'incorrect':
      seq(ctx, [
        [N.G4, 0.13, 0.45, 'sawtooth'],
        [N.E4, 0.13, 0.45, 'sawtooth'],
        [N.C4, 0.22, 0.5,  'sawtooth'],
      ], vol);
      break;

    case 'combo':
      seq(ctx, [
        [N.C5, 0.05],
        [N.E5, 0.05, 0.55],
        [N.G5, 0.05, 0.60],
        [N.C6, 0.05, 0.65],
        [N.E6, 0.14, 0.75],
      ], vol);
      break;

    case 'levelup':
      seq(ctx, [
        [N.C5, 0.08],
        [N.E5, 0.08],
        [N.G5, 0.08],
        [N.C6, 0.08, 0.55],
        [N.E6, 0.08, 0.60],
        [N.C6, 0.08, 0.55],
        [N.E6, 0.28, 0.70],
      ], vol);
      break;

    case 'gameover':
      // Classic chromatic descending "wah wah wah wahhh"
      seq(ctx, [
        [N.Bb4, 0.20, 0.5, 'sawtooth'],
        [N.A4,  0.20, 0.5, 'sawtooth'],
        [N.Ab4, 0.20, 0.5, 'sawtooth'],
        [N.G4,  0.40, 0.6, 'sawtooth'],
      ], vol);
      break;

    case 'ending':
      // Ode to Joy — Beethoven (1824, public domain)
      seq(ctx, [
        [N.E5, 0.12],
        [N.E5, 0.12],
        [N.F5, 0.12],
        [N.G5, 0.12],
        [N.G5, 0.12],
        [N.F5, 0.12],
        [N.E5, 0.12],
        [N.D5, 0.12],
        [N.C5, 0.12],
        [N.C5, 0.12],
        [N.D5, 0.12],
        [N.E5, 0.12],
        [N.E5, 0.18, 0.65],
        [N.D5, 0.06],
        [N.D5, 0.30, 0.75],
      ], vol);
      break;
  }
}
