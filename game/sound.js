// TIDEBOUND — tiny WebAudio synth. No audio files: every sound is
// generated, so the game loads nothing over the network.
let ctx = null;
let muted = false;

export function setMuted(m) { muted = m; }

function audio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { return null; }
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, dur, type = "sine", vol = 0.08, when = 0) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  draw() { tone(520, 0.08, "triangle", 0.05); },
  play() { tone(392, 0.1, "triangle", 0.08); tone(587, 0.12, "sine", 0.06, 0.05); },
  combo() { [523, 659, 784].forEach((f, i) => tone(f, 0.14, "triangle", 0.07, i * 0.06)); },
  hit() { tone(160, 0.18, "sawtooth", 0.06); },
  heal() { tone(660, 0.16, "sine", 0.05); tone(880, 0.2, "sine", 0.04, 0.08); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, "triangle", 0.08, i * 0.12)); },
  loss() { [392, 330, 262].forEach((f, i) => tone(f, 0.25, "sine", 0.07, i * 0.14)); },
  click() { tone(700, 0.05, "square", 0.03); },
};
