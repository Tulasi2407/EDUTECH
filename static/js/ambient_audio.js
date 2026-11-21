/**
 * Roots & Rhythm - Native Web Audio API Sound Synthesizer.
 * Provides synthesized study soundscapes (Rain, Alpha Waves, Chimes) with 0 network downloads.
 */

class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem("roots_sound_muted") === "true";
    this.ambientSource = null;
    this.ambientGain = null;
    this.currentAmbientType = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem("roots_sound_muted", this.muted);
    if (this.muted && this.ambientSource) {
      this.stopAmbient();
    }
    return this.muted;
  }

  playSuccessChime() {
    if (this.muted) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Play a lovely uplifting Major triad (E5, G#5, B5)
      const notes = [659.25, 830.61, 987.77];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.65);
      });
    } catch (e) {
      console.warn("Audio chime skipped:", e);
    }
  }

  playLevelUpFanfare() {
    if (this.muted) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.1 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.9);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.95);
      });
    } catch (e) {
      console.warn("Level up audio error:", e);
    }
  }

  startAmbient(type = "rain") {
    if (this.muted) return;
    this.stopAmbient();
    this.ensureContext();
    if (!this.ctx) return;

    this.currentAmbientType = type;

    if (type === "rain") {
      // Synthesize pink/brown noise with low-pass filter
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Gain boost
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);

      noise.start();
      this.ambientSource = noise;
    } else if (type === "alpha") {
      // 10 Hz Binaural Beat (190 Hz left, 200 Hz right)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.frequency.value = 196;
      osc2.frequency.value = 206; // 10Hz difference = Alpha Waves

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      osc1.connect(this.ambientGain);
      osc2.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      this.ambientSource = {
        stop: () => {
          osc1.stop();
          osc2.stop();
        }
      };
    }
  }

  stopAmbient() {
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
      } catch (e) {}
      this.ambientSource = null;
    }
    this.currentAmbientType = null;
  }
}

window.soundSynth = new SoundSynthesizer();
