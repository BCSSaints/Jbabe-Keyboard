
import { SynthSettings } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private analyzer: AnalyserNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbLevel: GainNode | null = null;
  private activeOscillators: Map<number, { nodes: AudioNode[]; gain: GainNode }> = new Map();
  private noiseBuffer: AudioBuffer | null = null;

  // Microphone state
  private micStream: MediaStream | null = null;
  private micAnalyzer: AnalyserNode | null = null;
  private micDataArray: Float32Array | null = null;

  private settings: SynthSettings = {
    oscType: 'triangle',
    attack: 0.002,
    decay: 1.5,
    sustain: 0.02,
    release: 0.5,
    cutoff: 2800,
    resonance: 0.5,
    reverb: 0.4,
    detune: 0
  };

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx({ sampleRate: 44100 });
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      
      this.analyzer = this.ctx.createAnalyser();
      this.analyzer.fftSize = 256;

      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.createReverbBuffer(2.5, 4.0);
      this.reverbLevel = this.ctx.createGain();
      this.reverbLevel.gain.value = this.settings.reverb;

      this.filter.connect(this.masterGain);
      this.filter.connect(this.reverbNode);
      this.reverbNode.connect(this.reverbLevel);
      this.reverbLevel.connect(this.masterGain);
      
      this.masterGain.connect(this.analyzer);
      this.analyzer.connect(this.ctx.destination);

      const bufferSize = this.ctx.sampleRate * 0.1;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      this.updateNodes();
    } catch (e) {
      console.warn("Audio Context delay: waiting for user gesture.");
    }
  }

  async startMic(): Promise<boolean> {
    if (!this.ctx) this.init();
    if (!this.ctx) return false;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.ctx.createMediaStreamSource(this.micStream);
      this.micAnalyzer = this.ctx.createAnalyser();
      this.micAnalyzer.fftSize = 2048;
      this.micDataArray = new Float32Array(this.micAnalyzer.fftSize);
      source.connect(this.micAnalyzer);
      return true;
    } catch (err) {
      console.error("Microphone access denied", err);
      return false;
    }
  }

  stopMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    this.micAnalyzer = null;
  }

  getDetectedPitch(): { frequency: number; note: number; cents: number } | null {
    if (!this.micAnalyzer || !this.micDataArray || !this.ctx) return null;
    
    this.micAnalyzer.getFloatTimeDomainData(this.micDataArray);
    const pitch = this.autoCorrelate(this.micDataArray, this.ctx.sampleRate);
    
    if (pitch === -1) return null;

    const midi = 12 * (Math.log(pitch / 440) / Math.log(2)) + 69;
    const note = Math.round(midi);
    const cents = Math.floor(100 * (midi - note));
    
    return { frequency: pitch, note, cents };
  }

  private autoCorrelate(buffer: Float32Array, sampleRate: number): number {
    // Simple autocorrelation for pitch detection
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    if (rms < 0.01) return -1; // Too quiet

    let r1 = 0, r2 = buffer.length - 1, thres = 0.2;
    for (let i = 0; i < buffer.length / 2; i++) {
      if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < buffer.length / 2; i++) {
      if (Math.abs(buffer[buffer.length - i]) < thres) { r2 = buffer.length - i; break; }
    }

    const buf = buffer.slice(r1, r2);
    const size = buf.length;
    const c = new Array(size).fill(0);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size - i; j++) {
        c[i] = c[i] + buf[j] * buf[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < size; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    // Interpolation for better precision
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a !== 0) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  }

  private createReverbBuffer(duration: number, decay: number): AudioBuffer {
    const sampleRate = this.ctx?.sampleRate || 44100;
    const length = sampleRate * duration;
    const buffer = this.ctx!.createBuffer(2, length, sampleRate);
    for (let i = 0; i < 2; i++) {
      const data = buffer.getChannelData(i);
      for (let j = 0; j < length; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
      }
    }
    return buffer;
  }

  private updateNodes() {
    if (!this.filter || !this.reverbLevel || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.filter.frequency.setTargetAtTime(this.settings.cutoff, now, 0.05);
    this.filter.Q.setTargetAtTime(this.settings.resonance, now, 0.05);
    this.reverbLevel.gain.setTargetAtTime(this.settings.reverb, now, 0.05);
  }

  setSettings(newSettings: Partial<SynthSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.updateNodes();
  }

  playNote(midi: number) {
    if (!this.ctx) {
      this.init();
    }
    
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!this.ctx || !this.filter || !this.noiseBuffer) return;

    this.stopNote(midi);

    const now = this.ctx.currentTime;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const nodes: AudioNode[] = [];

    const gainNode = this.ctx.createGain();

    if (this.settings.oscType === 'vocal') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(5.5, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(2.0, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      nodes.push(lfo, lfoGain);

      const formants = [
        { f: 800, q: 10, g: 0.6 },
        { f: 1150, q: 12, g: 0.4 },
        { f: 2900, q: 8, g: 0.2 }
      ];

      const formantGainSum = this.ctx.createGain();
      formantGainSum.gain.setValueAtTime(1.0, now);

      formants.forEach(formant => {
        const bp = this.ctx!.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(formant.f, now);
        bp.Q.setValueAtTime(formant.q, now);
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(formant.g, now);
        osc.connect(bp);
        bp.connect(g);
        g.connect(formantGainSum);
        nodes.push(bp, g);
      });

      formantGainSum.connect(gainNode);
      nodes.push(osc, formantGainSum);
      osc.start(now);
    } else {
      const hammer = this.ctx.createBufferSource();
      hammer.buffer = this.noiseBuffer;
      const hammerFilter = this.ctx.createBiquadFilter();
      hammerFilter.type = 'bandpass';
      hammerFilter.frequency.setValueAtTime(1200, now);
      hammerFilter.Q.setValueAtTime(1.0, now);
      const hammerGain = this.ctx.createGain();
      hammerGain.gain.setValueAtTime(0.3, now);
      hammerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      hammer.connect(hammerFilter);
      hammerFilter.connect(hammerGain);
      hammerGain.connect(gainNode);
      nodes.push(hammer, hammerFilter, hammerGain);

      const osc1 = this.ctx.createOscillator();
      osc1.type = this.settings.oscType as any;
      osc1.frequency.setValueAtTime(freq, now);
      osc1.detune.setValueAtTime(this.settings.detune - 2, now);
      osc1.connect(gainNode);
      nodes.push(osc1);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);
      const osc2Gain = this.ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.15, now);
      osc2.connect(osc2Gain);
      osc2Gain.connect(gainNode);
      nodes.push(osc2, osc2Gain);

      hammer.start(now);
      osc1.start(now);
      osc2.start(now);
    }

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.6, now + this.settings.attack);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, this.settings.sustain), now + this.settings.attack + this.settings.decay);
    gainNode.connect(this.filter);
    this.activeOscillators.set(midi, { nodes, gain: gainNode });
  }

  stopNote(midi: number) {
    const active = this.activeOscillators.get(midi);
    if (active && this.ctx) {
      const { nodes, gain } = active;
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + this.settings.release);
      setTimeout(() => {
        nodes.forEach(n => {
          try {
            if (n instanceof OscillatorNode || n instanceof AudioBufferSourceNode) n.stop();
            n.disconnect();
          } catch(e) {}
        });
        gain.disconnect();
      }, this.settings.release * 1000 + 100);
      this.activeOscillators.delete(midi);
    }
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyzer) return null;
    const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
    this.analyzer.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

export const audioEngine = new AudioEngine();
