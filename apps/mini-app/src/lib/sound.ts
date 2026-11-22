class SoundEngine {
  ctx = null;
  enabled = localStorage.getItem('tff_sound') !== '0';

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const A = window.AudioContext || window.webkitAudioContext;
      if (A) this.ctx = new A();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isEnabled() {
    return this.enabled;
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('tff_sound', this.enabled ? '1' : '0');
    if (this.enabled) this.playClick();
    return this.enabled;
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(920, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.045);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + 0.05);
  }

  playAdd() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [587.33, 880].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, t + i * 0.065);
      g.gain.setValueAtTime(0.12, t + i * 0.065);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.065 + 0.16);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t + i * 0.065);
      o.stop(t + i * 0.065 + 0.17);
    });
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, t + i * 0.08);
      g.gain.setValueAtTime(0.14, t + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.35);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t + i * 0.08);
      o.stop(t + i * 0.08 + 0.36);
    });
  }
}

export const soundFX = new SoundEngine();
