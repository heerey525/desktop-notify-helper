// 提示音全部由 Web Audio 合成，无需外部音频素材
let ctx = null

function audioCtx() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function blip(c, freq, at, dur, type, peak) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.014)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

const PATTERNS = {
  ding: [[880, 0, 0.16, 'sine', 0.3], [1318.5, 0.17, 0.36, 'sine', 0.26]],
  chime: [
    [523.25, 0, 0.2, 'triangle', 0.26],
    [659.25, 0.15, 0.2, 'triangle', 0.26],
    [783.99, 0.3, 0.22, 'triangle', 0.26],
    [1046.5, 0.46, 0.5, 'triangle', 0.24],
  ],
  bell: [
    [659.25, 0, 1.7, 'sine', 0.3],
    [1318.5, 0, 1.2, 'sine', 0.11],
    [1975.5, 0, 0.8, 'sine', 0.05],
  ],
  buzz: [
    [196, 0, 0.14, 'square', 0.16],
    [196, 0.22, 0.14, 'square', 0.16],
    [233.08, 0.44, 0.22, 'square', 0.16],
  ],
}

function playSound(kind) {
  const notes = PATTERNS[kind]
  if (!notes) return
  try {
    const c = audioCtx()
    const t0 = c.currentTime + 0.05
    for (const [freq, at, dur, type, peak] of notes) blip(c, freq, t0 + at, dur, type, peak)
  } catch (err) {
    console.error('提示音播放失败', err)
  }
}
