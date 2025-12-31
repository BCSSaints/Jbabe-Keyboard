
import React, { useState, useEffect, useCallback } from 'react';
import { PIANO_KEYS_61, COMPUTER_KEYBOARD_MAP } from './constants';
import { PianoKey } from './components/PianoKey';
import { audioEngine } from './services/audioEngine';
import { SynthSettings } from './types';
import { Visualizer } from './components/Visualizer';

const PRESETS: Record<string, Partial<SynthSettings>> = {
  'Carrying the Banner': { 
    oscType: 'triangle', 
    attack: 0.002, 
    decay: 1.8, 
    sustain: 0.01, 
    release: 0.35, 
    cutoff: 3500, 
    resonance: 0.5, 
    reverb: 0.5 
  },
  'King of New York': { 
    oscType: 'sawtooth', 
    attack: 0.08, 
    decay: 0.3, 
    sustain: 0.6, 
    release: 0.8, 
    cutoff: 2500, 
    resonance: 6, 
    reverb: 0.4 
  },
  'Santa Fe': { 
    oscType: 'sine', 
    attack: 1.2, 
    decay: 2.0, 
    sustain: 0.7, 
    release: 2.5, 
    cutoff: 1500, 
    resonance: 1, 
    reverb: 0.9 
  },
  'Strike!': { 
    oscType: 'square', 
    attack: 0.01, 
    decay: 0.5, 
    sustain: 0, 
    release: 0.1, 
    cutoff: 500, 
    resonance: 10, 
    reverb: 0.2 
  }
};

const App: React.FC = () => {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [currentTone, setCurrentTone] = useState('Carrying the Banner');

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
      const key = e.key.toLowerCase();
      const midi = COMPUTER_KEYBOARD_MAP[key];
      if (midi) {
        e.preventDefault();
        handleNoteOn(midi);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const midi = COMPUTER_KEYBOARD_MAP[key];
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
    <div className="h-screen bg-[#1c1917] text-[#d4c5b3] flex flex-col font-serif select-none overflow-hidden relative">
      {/* Newspaper Header */}
      <header className="pt-10 pb-6 flex flex-col items-center border-b-4 border-double border-[#4a3f35] mx-8">
        <div className="w-full flex justify-between items-end mb-2 px-4 uppercase text-[10px] tracking-[0.4em] font-bold text-[#8b735b]">
          <span>Vol. LXIX — No. 1899</span>
          <span>New York City</span>
          <span>Two Cents</span>
        </div>
        <h1 className="newspaper-title text-6xl sm:text-7xl font-black tracking-tight text-white mb-2 italic">
          The Jbabe Gazette
        </h1>
        <div className="w-full border-t border-[#4a3f35] pt-2 flex flex-col items-center gap-4">
          <p className="typewriter text-xs uppercase tracking-widest text-[#8b735b]">EXTRA! EXTRA! Choose your melody!</p>
          <div className="flex gap-2 sm:gap-4 flex-wrap justify-center px-4">
            {Object.keys(PRESETS).map(name => (
              <button
                key={name}
                onClick={() => setTone(name)}
                className={`px-6 py-2 rounded-sm text-xs font-bold transition-all duration-200 border border-[#4a3f35] uppercase tracking-tighter ${
                  currentTone === name
                    ? 'bg-[#d4c5b3] text-[#1c1917] scale-105 shadow-[4px_4px_0px_#4a3f35]'
                    : 'bg-transparent text-[#d4c5b3] hover:bg-[#2a241e] opacity-70 hover:opacity-100'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Keyboard Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-[1400px] bg-[#2a241e] rounded-lg border-4 border-[#4a3f35] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
          {/* Audio Visualizer styled like an ink-graph */}
          <Visualizer />
          
          <div className="p-4 sm:p-8 bg-[#221c18]">
            <div className="flex overflow-x-auto overflow-y-hidden pb-12 scroll-smooth no-scrollbar">
              <div className="flex min-w-max h-[280px] sm:h-[340px] items-start mx-auto bg-[#1a1512] p-2 rounded-lg shadow-inner">
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
            
            <div className="mt-6 flex justify-between items-center px-4 text-[#8b735b] font-serif text-[11px] uppercase tracking-[0.2em] italic border-t border-[#3d3128] pt-4">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 border border-[#8b735b] rotate-45 ${activeNotes.size > 0 ? 'bg-[#d4c5b3]' : 'bg-transparent'}`}></span>
                {activeNotes.size > 0 ? 'Resonance in Motion' : 'Waiting for the News'}
              </div>
              <span className="hidden sm:inline">Desktop Typing: A to L Rows</span>
              <span className="hidden sm:inline">Active Voices: {activeNotes.size}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Vintage Footer */}
      <footer className="p-6 text-center text-[10px] text-[#5c4d3f] font-bold uppercase tracking-[0.4em] border-t border-[#2a241e]">
        Pulitzer & Hearst Approved &bull; Est. 1899
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
