
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  "Medda's 'Ah'": {
    oscType: 'vocal',
    attack: 0.1,
    decay: 0.5,
    sustain: 0.8,
    release: 0.4,
    cutoff: 8000,
    resonance: 1,
    reverb: 0.6
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

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const App: React.FC = () => {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [currentTone, setCurrentTone] = useState('Carrying the Banner');
  const [isMicActive, setIsMicActive] = useState(false);
  const [detectedPitch, setDetectedPitch] = useState<{ frequency: number; note: number; cents: number } | null>(null);
  
  const micIntervalRef = useRef<number | null>(null);
  const keyboardScrollRef = useRef<HTMLDivElement>(null);
  const keyRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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

  const toggleMic = async () => {
    if (isMicActive) {
      audioEngine.stopMic();
      if (micIntervalRef.current) clearInterval(micIntervalRef.current);
      setIsMicActive(false);
      setDetectedPitch(null);
    } else {
      const success = await audioEngine.startMic();
      if (success) {
        setIsMicActive(true);
        micIntervalRef.current = window.setInterval(() => {
          const pitch = audioEngine.getDetectedPitch();
          setDetectedPitch(pitch);
        }, 80);
      }
    }
  };

  // Auto-scroll logic: Center the keyboard on the detected pitch
  useEffect(() => {
    if (isMicActive && detectedPitch && keyboardScrollRef.current) {
      const keyElement = keyRefs.current.get(detectedPitch.note);
      if (keyElement) {
        const container = keyboardScrollRef.current;
        const scrollPos = keyElement.offsetLeft - (container.offsetWidth / 2) + (keyElement.offsetWidth / 2);
        container.scrollTo({ left: scrollPos, behavior: 'smooth' });
      }
    }
  }, [detectedPitch?.note, isMicActive]);

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
      if (micIntervalRef.current) clearInterval(micIntervalRef.current);
    };
  }, [handleNoteOn, handleNoteOff]);

  const getPitchStatus = () => {
    if (!detectedPitch) return { text: "SILENCE IN THE THEATER", color: "text-[#8b735b]", offset: 50 };
    const { cents } = detectedPitch;
    if (Math.abs(cents) < 15) return { text: "ON KEY! CARRY THE BANNER!", color: "text-[#fdf6e3]", offset: 50 };
    if (cents < 0) return { text: "FLAT AS A PANCAKE", color: "text-[#d9b891]", offset: 50 + cents / 2 };
    return { text: "SHARP AS A TACK", color: "text-[#d9b891]", offset: 50 + cents / 2 };
  };

  const status = getPitchStatus();
  const detectedNoteName = detectedPitch ? `${NOTE_NAMES[detectedPitch.note % 12]}${Math.floor(detectedPitch.note / 12) - 1}` : "---";

  return (
    <div className="h-screen bg-[#1c1917] text-[#d4c5b3] flex flex-col font-serif select-none overflow-hidden relative">
      {/* Newspaper Header - More compact for smaller screens */}
      <header className="pt-4 sm:pt-6 pb-2 flex flex-col items-center border-b-4 border-double border-[#4a3f35] mx-4 sm:mx-8 shrink-0">
        <div className="w-full flex justify-between items-end mb-1 px-4 uppercase text-[8px] sm:text-[10px] tracking-[0.4em] font-bold text-[#8b735b]">
          <span>Vol. LXIX — No. 1899</span>
          <span className="hidden sm:inline">New York City</span>
          <span>Two Cents</span>
        </div>
        <h1 className="newspaper-title text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-1 italic">
          The Jbabe Gazette
        </h1>
        <div className="w-full border-t border-[#4a3f35] pt-2 flex flex-col items-center gap-2">
          <div className="flex gap-1 sm:gap-3 flex-wrap justify-center px-4">
            {Object.keys(PRESETS).map(name => (
              <button
                key={name}
                onClick={() => setTone(name)}
                className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-sm text-[8px] sm:text-[10px] font-bold transition-all duration-200 border border-[#4a3f35] uppercase tracking-tighter ${
                  currentTone === name
                    ? 'bg-[#d4c5b3] text-[#1c1917] scale-105 shadow-[2px_2px_0px_#4a3f35]'
                    : 'bg-transparent text-[#d4c5b3] hover:bg-[#2a241e] opacity-70 hover:opacity-100'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-4 p-4 overflow-hidden items-stretch">
        {/* Top Section: Audition and Visualizer row */}
        <div className="flex flex-col lg:flex-row gap-4 shrink-0 lg:h-[220px]">
          {/* Vocal Audition Panel - More compact */}
          <div className="w-full lg:w-1/3 bg-[#2a241e] border-2 border-[#4a3f35] p-4 rounded shadow-lg flex flex-row lg:flex-col items-center lg:justify-center gap-4 relative overflow-hidden">
            <div className="hidden lg:block absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
              <svg width="60" height="60" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="white" strokeWidth="2" fill="none"/></svg>
            </div>
            
            <div className="flex-1 lg:flex-none text-center lg:mb-2">
              <h2 className="newspaper-title text-lg sm:text-xl text-white underline decoration-double">AUDITION</h2>
              <p className="typewriter text-[8px] text-[#8b735b] uppercase tracking-widest hidden sm:block">Match the key</p>
            </div>

            <div className="flex-[2] lg:flex-none bg-[#1c1917] p-3 rounded-sm border border-[#4a3f35] flex items-center justify-between lg:flex-col lg:gap-2 shadow-inner w-full max-w-[300px] lg:max-w-none">
              <div className="text-center">
                <span className="text-[8px] uppercase text-[#8b735b] block">Note</span>
                <span className="text-3xl lg:text-4xl font-black newspaper-title text-white tracking-tighter">
                  {detectedNoteName}
                </span>
              </div>

              <div className="hidden sm:block flex-1 mx-4 lg:mx-0 lg:w-full">
                <div className="h-3 bg-[#2a241e] border border-[#4a3f35] relative rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-[#d4c5b3] transition-all duration-100 shadow-[0_0_8px_#d4c5b3]" 
                    style={{ left: `${status.offset}%` }}
                  />
                </div>
                <p className={`typewriter text-[7px] uppercase font-bold tracking-widest mt-1 text-center truncate ${status.color}`}>
                  {status.text}
                </p>
              </div>
            </div>

            <button
              onClick={toggleMic}
              className={`flex-1 lg:flex-none py-3 lg:w-full rounded-sm border-2 transition-all duration-300 uppercase font-black text-[10px] tracking-[0.15em] shadow-lg ${
                isMicActive 
                  ? 'bg-[#8b0000] border-[#4a0000] text-white animate-pulse' 
                  : 'bg-[#d4c5b3] border-[#a08b73] text-[#1c1917] hover:scale-[1.02]'
              }`}
            >
              {isMicActive ? "STOP" : "SING!"}
            </button>
          </div>

          {/* Visualizer area */}
          <div className="flex-1 bg-[#2a241e] rounded border-2 border-[#4a3f35] overflow-hidden flex flex-col">
             <div className="bg-[#1a1512] px-3 py-1 border-b border-[#3d3128] flex justify-between items-center">
                <span className="typewriter text-[8px] uppercase text-[#8b735b]">Vocal Signature Graph</span>
                <div className="flex gap-1">
                   <div className="w-1 h-1 bg-[#8b735b] rounded-full"></div>
                   <div className="w-1 h-1 bg-[#8b735b] rounded-full opacity-50"></div>
                </div>
             </div>
             <div className="flex-1 relative">
                <Visualizer />
             </div>
          </div>
        </div>

        {/* Bottom Section: The Keyboard - Always visible and central */}
        <div className="flex-1 bg-[#2a241e] rounded-lg border-4 border-[#4a3f35] shadow-2xl overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 p-2 sm:p-4 bg-[#221c18] flex flex-col justify-center min-h-0 relative">
            <div 
              ref={keyboardScrollRef}
              className="flex overflow-x-auto overflow-y-hidden pb-10 scroll-smooth no-scrollbar"
            >
              <div className="flex min-w-max h-full min-h-[220px] sm:min-h-[280px] items-start mx-auto bg-[#1a1512] p-2 rounded-lg shadow-inner">
                {PIANO_KEYS_61.map((note) => (
                  <div 
                    key={note.midi}
                    ref={el => { if (el) keyRefs.current.set(note.midi, el); }}
                  >
                    <PianoKey
                      note={note}
                      isActive={activeNotes.has(note.midi)}
                      isVocalActive={detectedPitch?.note === note.midi}
                      onMouseDown={handleNoteOn}
                      onMouseUp={handleNoteOff}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Keyboard HUD */}
            <div className="absolute bottom-2 left-4 right-4 flex justify-between items-center text-[#8b735b] font-serif text-[10px] uppercase tracking-[0.1em] italic">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 border border-[#8b735b] rotate-45 ${activeNotes.size > 0 || isMicActive ? 'bg-[#d4c5b3]' : 'bg-transparent'}`}></span>
                {isMicActive ? 'Voice Tracking...' : 'Idle'}
              </div>
              <div className="flex gap-4">
                <span className="hidden sm:inline">Active Notes: {activeNotes.size}</span>
                <span className="hidden sm:inline">Range: C2 - C7</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Vintage Footer */}
      <footer className="p-2 sm:p-4 text-center text-[9px] text-[#5c4d3f] font-bold uppercase tracking-[0.4em] border-t border-[#2a241e] shrink-0">
        Pulitzer & Hearst Approved &bull; Est. 1899 &bull; Newsies of the World Unite
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
