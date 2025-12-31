
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
    osc1.type = this.settings.oscType;
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

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.6, now + this.settings.attack);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, this.settings.sustain), now + this.settings.attack + this.settings.decay);

    gainNode.connect(this.filter);
    
    hammer.start(now);
    osc1.start(now);
    osc2.start(now);

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
    if (!this.analyzer) return null;
    const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
    this.analyzer.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

export const audioEngine = new AudioEngine();
