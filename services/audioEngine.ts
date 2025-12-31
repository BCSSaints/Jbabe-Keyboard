
import { SynthSettings } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbLevel: GainNode | null = null;
  private activeOscillators: Map<number, { nodes: AudioNode[]; gain: GainNode }> = new Map();
  private noiseBuffer: AudioBuffer | null = null;

  private settings: SynthSettings = {
    oscType: 'triangle',
    attack: 0.002,
    decay: 1.5,
    sustain: 0.02,
    release: 0.5,
    cutoff: 3200,
    resonance: 0.8,
    reverb: 0.45,
    detune: 0
  };

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    
    // Procedural Reverb for space
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createReverbBuffer(2.5, 4.0);
    this.reverbLevel = this.ctx.createGain();
    this.reverbLevel.gain.value = this.settings.reverb;

    // Routing
    this.filter.connect(this.masterGain);
    this.filter.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbLevel);
    this.reverbLevel.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Create a noise buffer for the hammer strike transient
    const bufferSize = this.ctx.sampleRate * 0.1; // 100ms noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    this.updateNodes();
  }

  private createReverbBuffer(duration: number, decay: number): AudioBuffer {
    const sampleRate = this.ctx?.sampleRate || 44100;
    const length = sampleRate * duration;
    const buffer = this.ctx!.createBuffer(2, length, sampleRate);
    for (let i = 0; i < 2; i++) {
      const data = buffer.getChannelData(i);
      for (let j = 0; j < length; j++) {
        // Exponentially decaying white noise with a bit of "diffusion"
        data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
      }
    }
    return buffer;
  }

  private updateNodes() {
    if (!this.filter || !this.reverbLevel || !this.ctx) return;
    this.filter.frequency.setTargetAtTime(this.settings.cutoff, this.ctx.currentTime, 0.05);
    this.filter.Q.setTargetAtTime(this.settings.resonance, this.ctx.currentTime, 0.05);
    this.reverbLevel.gain.setTargetAtTime(this.settings.reverb, this.ctx.currentTime, 0.05);
  }

  setSettings(newSettings: Partial<SynthSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.updateNodes();
  }

  playNote(midi: number) {
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.init();
      this.ctx?.resume();
    }
    if (!this.ctx || !this.filter || !this.noiseBuffer) return;

    this.stopNote(midi);

    const now = this.ctx.currentTime;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const nodes: AudioNode[] = [];

    const gainNode = this.ctx.createGain();
    
    // --- LAYER 1: Hammer Strike (Transient) ---
    const hammer = this.ctx.createBufferSource();
    hammer.buffer = this.noiseBuffer;
    const hammerFilter = this.ctx.createBiquadFilter();
    hammerFilter.type = 'bandpass';
    hammerFilter.frequency.setValueAtTime(1200, now);
    hammerFilter.Q.setValueAtTime(1.0, now);
    
    const hammerGain = this.ctx.createGain();
    hammerGain.gain.setValueAtTime(0.4, now);
    hammerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    hammer.connect(hammerFilter);
    hammerFilter.connect(hammerGain);
    hammerGain.connect(gainNode);
    nodes.push(hammer, hammerFilter, hammerGain);

    // --- LAYER 2: Fundamental String Body ---
    const osc1 = this.ctx.createOscillator();
    osc1.type = this.settings.oscType; // usually triangle for piano
    osc1.frequency.setValueAtTime(freq, now);
    osc1.detune.setValueAtTime(this.settings.detune - 2, now);
    osc1.connect(gainNode);
    nodes.push(osc1);

    // --- LAYER 3: First Harmonic (Overtones) ---
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);
    osc2.detune.setValueAtTime(this.settings.detune + 2, now);
    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.2, now);
    osc2.connect(osc2Gain);
    osc2Gain.connect(gainNode);
    nodes.push(osc2, osc2Gain);

    // --- LAYER 4: String Inharmonicity / Resonance ---
    const osc3 = this.ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3, now);
    const osc3Gain = this.ctx.createGain();
    osc3Gain.gain.setValueAtTime(0.05, now);
    osc3.connect(osc3Gain);
    osc3Gain.connect(gainNode);
    nodes.push(osc3, osc3Gain);

    // --- MAIN ENVELOPE ---
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.7, now + this.settings.attack);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, this.settings.sustain), now + this.settings.attack + this.settings.decay);

    // Dynamic Filter Envelope (Piano starts bright, quickly mellows)
    const baseCutoff = this.settings.cutoff;
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(Math.min(18000, baseCutoff * 3), now);
    this.filter.frequency.exponentialRampToValueAtTime(baseCutoff, now + 0.1);

    gainNode.connect(this.filter);
    
    // Start all sound sources
    hammer.start(now);
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    this.activeOscillators.set(midi, { nodes, gain: gainNode });
  }

  stopNote(midi: number) {
    const active = this.activeOscillators.get(midi);
    if (active && this.ctx) {
      const { nodes, gain } = active;
      const now = this.ctx.currentTime;
      
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      // Realistic release is short but present
      gain.gain.exponentialRampToValueAtTime(0.0001, now + this.settings.release);
      
      setTimeout(() => {
        nodes.forEach(n => {
          try {
            if (n instanceof OscillatorNode || n instanceof AudioBufferSourceNode) {
              n.stop();
            }
            n.disconnect();
          } catch(e) {}
        });
        gain.disconnect();
      }, this.settings.release * 1000 + 100);
      
      this.activeOscillators.delete(midi);
    }
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.filter || !this.ctx) return null;
    const analyzer = this.ctx.createAnalyser();
    this.filter.connect(analyzer);
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    analyzer.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

export const audioEngine = new AudioEngine();
