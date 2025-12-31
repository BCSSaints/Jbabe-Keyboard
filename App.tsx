
import React, { useState, useEffect, useCallback } from 'react';
import { PIANO_KEYS_61, COMPUTER_KEYBOARD_MAP } from './constants';
import { PianoKey } from './components/PianoKey';
import { audioEngine } from './services/audioEngine';
import { SynthSettings } from './types';

const PRESETS: Record<string, Partial<SynthSettings>> = {
  'Piano': { 
    oscType: 'triangle', 
    attack: 0.002, 
    decay: 1.8, 
    sustain: 0.01, 
    release: 0.35, 
    cutoff: 2800, 
    resonance: 0.5, 
    reverb: 0.4 
  },
  'Synth': { 
    oscType: 'sawtooth', 
    attack: 0.05, 
    decay: 0.2, 
    sustain: 0.4, 
    release: 0.8, 
    cutoff: 2000, 
    resonance: 4, 
    reverb: 0.3 
  },
  'Space': { 
    oscType: 'sine', 
    attack: 0.8, 
    decay: 1.5, 
    sustain: 0.6, 
    release: 2.0, 
    cutoff: 1200, 
    resonance: 1, 
    reverb: 0.8 
  },
  'Bass': { 
    oscType: 'square', 
    attack: 0.01, 
    decay: 0.4, 
    sustain: 0, 
    release: 0.1, 
    cutoff: 600, 
    resonance: 8, 
    reverb: 0.1 
  }
};

const App: React.FC = () => {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [currentTone, setCurrentTone] = useState('Piano');

  const setTone = (name: string) => {
    setCurrentTone(name);
    audioEngine.setSettings(PRESETS[name]);
  };

  const handleNoteOn = useCallback((midi: number) => {
    setActiveNotes(prev => {
      const next = new Set(prev);
      next.add(midi);
      return next;
    });
    audioEngine.playNote(midi);
  }, []);

  const handleNoteOff = useCallback((midi: number) => {
    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
    audioEngine.stopNote(midi);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const midi = COMPUTER_KEYBOARD_MAP[e.key.toLowerCase()];
      if (midi) handleNoteOn(midi);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const midi = COMPUTER_KEYBOARD_MAP[e.key.toLowerCase()];
      if (midi) handleNoteOff(midi);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleNoteOn, handleNoteOff]);

  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col font-sans select-none">
      {/* Centered Header */}
      <header className="py-12 flex flex-col items-center gap-4">
        <h1 className="text-5xl font-black tracking-tighter text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          Jbabe keyboard
        </h1>
        <div className="flex gap-4 mt-4">
          {Object.keys(PRESETS).map(name => (
            <button
              key={name}
              onClick={() => setTone(name)}
              className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-200 border-2 ${
                currentTone === name
                  ? 'bg-blue-600 border-blue-400 scale-105 shadow-lg'
                  : 'bg-neutral-900 border-neutral-800 hover:border-neutral-600 opacity-60 hover:opacity-100'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </header>

      {/* Keyboard Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden">
        <div className="w-full max-w-[1400px] bg-neutral-900/40 rounded-3xl border border-white/5 p-8 shadow-2xl">
          <div className="flex overflow-x-auto overflow-y-hidden pb-12 scroll-smooth no-scrollbar">
            <div className="flex min-w-max h-[400px] items-start mx-auto">
              {PIANO_KEYS_61.map((note) => (
                <PianoKey
                  key={note.midi}
                  note={note}
                  isActive={activeNotes.has(note.midi)}
                  onMouseDown={handleNoteOn}
                  onMouseUp={handleNoteOff}
                />
              ))}
            </div>
          </div>
          
          <div className="mt-8 flex justify-center items-center gap-8 text-neutral-500 font-mono text-xs uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              High Definition Audio
            </div>
            <span>Keys A-L Map</span>
            <span>61 Polyphonic Layers</span>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="p-6 text-center text-[10px] text-neutral-700 font-bold uppercase tracking-[0.2em]">
        Designed for Jbabe &bull; Multi-Sample Additive Engine
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
