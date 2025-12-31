
export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'vocal';

export interface SynthSettings {
  oscType: OscillatorType;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  cutoff: number;
  resonance: number;
  reverb: number;
  detune: number;
}

export interface Note {
  midi: number;
  name: string;
  isBlack: boolean;
}

export interface AIPresetRequest {
  mood: string;
}
