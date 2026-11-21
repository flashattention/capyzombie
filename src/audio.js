// 효과음: 외부 파일 없이 Web Audio로 합성한다. 첫 사용자 입력 뒤에 initAudio()를 불러야 소리가 난다.
let ctx = null, master = null, noiseBuf = null, enabled = true;
const last = {};

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC(); master = ctx.createGain(); master.gain.value = enabled ? 0.5 : 0; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ctx = null; }
}
// 앱이 백그라운드로 가거나 탭이 가려지면 소리를 멈춘다
export function suspendAudio() { if (ctx && ctx.state === 'running') ctx.suspend(); }
export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
export function setSound(on) { enabled = on; if (master) master.gain.value = on ? 0.5 : 0; }

function tone(freq, dur, type, vol, to, delay = 0) {
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, kind = 'lowpass', delay = 0) {
  const t = ctx.currentTime + delay, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = kind; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5, dur + 0.02);
}
// 같은 소리가 너무 촘촘히 겹치지 않게 최소 간격(ms)을 둔다
function play(name, gap, fn) {
  if (!ctx || !enabled) return;
  const now = performance.now(); if (now - (last[name] || 0) < gap) return; last[name] = now;
  try { fn(); } catch (e) { /* 소리 실패는 게임을 막지 않는다 */ }
}

export const sfx = {
  shot: () => play('shot', 55, () => { noise(0.05, 0.22, 1600, 'highpass'); tone(170, 0.06, 'square', 0.1, 70); }),
  hit: () => play('hit', 40, () => tone(620, 0.04, 'triangle', 0.13, 340)),
  kill: () => play('kill', 45, () => { tone(240, 0.1, 'square', 0.09, 80); noise(0.08, 0.12, 900); }),
  boom: () => play('boom', 70, () => { noise(0.5, 0.6, 520); tone(95, 0.45, 'sine', 0.5, 32); }),
  rocket: () => play('rocket', 80, () => { noise(0.3, 0.25, 1200, 'bandpass'); tone(300, 0.3, 'sawtooth', 0.08, 120); }),
  stomp: () => play('stomp', 100, () => { noise(0.35, 0.5, 300); tone(70, 0.4, 'sine', 0.6, 28); }),
  pickup: () => play('pickup', 35, () => tone(880, 0.07, 'sine', 0.1, 1320)),
  heart: () => play('heart', 80, () => { tone(660, 0.1, 'sine', 0.15, 990); tone(990, 0.14, 'sine', 0.12, 1320, 0.08); }),
  level: () => play('level', 200, () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.16, 0, i * 0.08))),
  hurt: () => play('hurt', 180, () => { tone(150, 0.16, 'sawtooth', 0.18, 60); noise(0.1, 0.15, 500); }),
  jump: () => play('jump', 80, () => tone(260, 0.12, 'sine', 0.1, 520)),
  rush: () => play('rush', 400, () => noise(0.35, 0.18, 700, 'bandpass')),
  laser: () => play('laser', 100, () => { tone(1500, 0.28, 'sawtooth', 0.14, 260); tone(750, 0.28, 'square', 0.06, 130); }),
  ult: () => play('ult', 300, () => { tone(200, 0.6, 'sawtooth', 0.2, 800); noise(0.6, 0.2, 2000, 'highpass'); }),
  boss: () => play('boss', 500, () => { tone(75, 0.9, 'sawtooth', 0.3, 45); tone(112, 0.9, 'sawtooth', 0.18, 60, 0.05); }),
  combo: () => play('combo', 200, () => [784, 988, 1175].forEach((f, i) => tone(f, 0.1, 'square', 0.09, 0, i * 0.06))),
  clear: () => play('clear', 500, () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.18, 0, i * 0.12))),
  over: () => play('over', 500, () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'triangle', 0.18, 0, i * 0.18))),
};
