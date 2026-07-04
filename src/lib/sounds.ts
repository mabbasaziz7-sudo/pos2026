// Web Audio API — no external files required, works offline

type BeepType = 'success' | 'error' | 'warning';

const BEEPS: Record<BeepType, { freq: number; duration: number; type: OscillatorType }> = {
  success: { freq: 1850, duration: 0.08, type: 'sine' },
  error:   { freq: 320,  duration: 0.25, type: 'square' },
  warning: { freq: 900,  duration: 0.12, type: 'sine' },
};

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext();
  }
  return ctx;
}

export function playScanBeep(type: BeepType = 'success'): void {
  if (typeof window === 'undefined') return;
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const cfg = BEEPS[type];

    osc.type = cfg.type;
    osc.frequency.setValueAtTime(cfg.freq, ac.currentTime);
    osc.connect(gain);
    gain.connect(ac.destination);
    gain.gain.setValueAtTime(0.35, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + cfg.duration);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + cfg.duration);
  } catch {
    // AudioContext blocked (e.g. before user interaction) — fail silently
  }
}
