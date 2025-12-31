
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PIANO_KEYS_61, COMPUTER_KEYBOARD_MAP } from './constants';
import { PianoKey } from './components/PianoKey';
import { audioEngine } from './services/audioEngine';
import { SynthSettings } from './types';
import { Visualizer } from './components/Visualizer';

const PRESETS: Record<string, Partial<SynthSettings>> = {
  'Banner': { 
    oscType: 'triangle', 
    attack: 0.002, 
    decay: 1.8, 
    sustain: 0.01, 
    release: 0.35, 
    cutoff: 3500, 
    resonance: 0.5, 
    reverb: 0.5 
  },
  'NYC': { 
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
  const [currentTone, setCurrentTone] = useState('Banner');
  const [isMicActive, setIsMicActive] = useState(false);
  const [detectedPitch, setDetectedPitch] = useState<{ frequency: number; note: number; cents: number } | null>(null);
  const [trackingMode, setTrackingMode] = useState<'follow' | 'match'>('follow');
  const [targetMidi, setTargetMidi] = useState<number | null>(60);
  const [isMobile, setIsMobile] = useState(false);
  
  const micIntervalRef = useRef<number | null>(null);
  const keyboardScrollRef = useRef<HTMLDivElement>(null);
  const keyRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Handle screen resizing
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    setTargetMidi(midi);
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

  useEffect(() => {
    if (isMicActive && detectedPitch && trackingMode === 'follow' && keyboardScrollRef.current) {
      const keyElement = keyRefs.current.get(detectedPitch.note);
      if (keyElement) {
        const container = keyboardScrollRef.current;
        const scrollPos = keyElement.offsetLeft - (container.offsetWidth / 2) + (keyElement.offsetWidth / 2);
        container.scrollTo({ left: scrollPos, behavior: 'smooth' });
      }
    }
  }, [detectedPitch?.note, isMicActive, trackingMode]);

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
    if (!detectedPitch) return { text: "SILENT", color: "text-[#8b735b]", offset: 50 };
    let cents = detectedPitch.cents;
    if (trackingMode === 'match' && targetMidi !== null) {
      const targetFreq = 440 * Math.pow(2, (targetMidi - 69) / 12);
      const diffMidi = 12 * (Math.log(detectedPitch.frequency / targetFreq) / Math.log(2));
      cents = Math.floor(100 * diffMidi);
    }
    if (Math.abs(cents) < 15) return { text: "ON KEY!", color: "text-[#fdf6e3]", offset: 50 };
    if (cents < 0) return { text: cents < -50 ? "LOW" : "FLAT", color: "text-[#d9b891]", offset: Math.max(0, 50 + cents / 2) };
    return { text: cents > 50 ? "HIGH" : "SHARP", color: "text-[#d9b891]", offset: Math.min(100, 50 + cents / 2) };
  };

  const status = getPitchStatus();
  const detectedNoteName = detectedPitch ? `${NOTE_NAMES[detectedPitch.note % 12]}${Math.floor(detectedPitch.note / 12) - 1}` : "---";
  const targetNoteName = targetMidi !== null ? `${NOTE_NAMES[targetMidi % 12]}${Math.floor(targetMidi / 12) - 1}` : "---";

  return (
    <div className="h-screen bg-[#1c1917] text-[#d4c5b3] flex flex-col font-serif select-none overflow-hidden relative">
      {/* Newspaper Header - More compact on mobile */}
      <header className={`px-4 sm:px-8 border-b-4 border-double border-[#4a3f35] shrink-0 transition-all ${isMobile ? 'pt-2 pb-1' : 'pt-4 pb-2'}`}>
        <div className="w-full flex justify-between items-end mb-1 uppercase text-[7px] sm:text-[10px] tracking-[0.4em] font-bold text-[#8b735b]">
          <span>Vol. LXIX — No. 1899</span>
          <span className="hidden sm:inline">New York City Edition</span>
          <span>Two Cents</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
           <h1 className={`newspaper-title font-black tracking-tight text-white italic transition-all ${isMobile ? 'text-2xl' : 'text-5xl'}`}>
             The Jbabe Gazette
           </h1>
           <div className="flex gap-1 sm:gap-2 flex-wrap justify-center overflow-x-auto no-scrollbar">
            {Object.keys(PRESETS).map(name => (
              <button
                key={name}
                onClick={() => setTone(name)}
                className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-sm text-[7px] sm:text-[9px] font-bold transition-all border border-[#4a3f35] uppercase tracking-tighter ${
                  currentTone === name ? 'bg-[#d4c5b3] text-[#1c1917]' : 'bg-transparent opacity-60'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-2 p-2 sm:p-4 overflow-hidden items-stretch">
        {/* Control Panel: Audition & Visualizer */}
        <div className={`flex flex-col lg:flex-row gap-2 shrink-0 ${isMobile ? '' : 'lg:h-[200px]'}`}>
          <div className="w-full lg:w-1/2 bg-[#2a241e] border-2 border-[#4a3f35] p-3 rounded shadow-lg flex flex-col gap-2">
            <div className="flex justify-between items-center">
               <h2 className="newspaper-title text-sm sm:text-base text-white underline">VOCAL AUDITION</h2>
               <div className="flex bg-[#1c1917] rounded-sm p-0.5 border border-[#4a3f35]">
                  <button 
                    onClick={() => setTrackingMode('follow')}
                    className={`px-1.5 py-0.5 text-[7px] sm:text-[8px] uppercase font-bold ${trackingMode === 'follow' ? 'bg-[#d4c5b3] text-[#1c1917]' : 'text-[#8b735b]'}`}
                  >
                    Follow
                  </button>
                  <button 
                    onClick={() => setTrackingMode('match')}
                    className={`px-1.5 py-0.5 text-[7px] sm:text-[8px] uppercase font-bold ${trackingMode === 'match' ? 'bg-[#d4c5b3] text-[#1c1917]' : 'text-[#8b735b]'}`}
                  >
                    Match
                  </button>
               </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 bg-[#1c1917] p-2 rounded-sm border border-[#4a3f35] flex flex-col items-center justify-center">
                <span className="text-[6px] sm:text-[7px] uppercase text-[#8b735b]">Voice</span>
                <span className={`text-xl sm:text-2xl font-black newspaper-title ${detectedPitch ? 'text-white' : 'text-[#3d3128]'}`}>
                  {detectedNoteName}
                </span>
              </div>
              {trackingMode === 'match' && (
                <div className="flex-1 bg-[#1c1917] p-2 rounded-sm border border-[#d4c5b3]/20 flex flex-col items-center justify-center">
                  <span className="text-[6px] sm:text-[7px] uppercase text-[#d4c5b3]/60">Target</span>
                  <span className="text-xl sm:text-2xl font-black newspaper-title text-[#d4c5b3]">
                    {targetNoteName}
                  </span>
                </div>
              )}
            </div>

            <div className="w-full bg-[#1c1917] p-1.5 border border-[#4a3f35] rounded-sm">
              <div className="h-2 bg-[#2a241e] relative rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-[#d4c5b3] transition-all" 
                  style={{ left: `${status.offset}%` }}
                />
              </div>
              <p className={`typewriter text-[7px] uppercase font-bold tracking-widest mt-1 text-center truncate ${status.color}`}>
                {status.text}
              </p>
            </div>

            <button
              onClick={toggleMic}
              className={`py-1.5 rounded-sm border-2 uppercase font-black text-[9px] tracking-[0.2em] shadow-lg ${
                isMicActive ? 'bg-[#8b0000] text-white animate-pulse' : 'bg-[#d4c5b3] text-[#1c1917]'
              }`}
            >
              {isMicActive ? "STOP" : "OPEN MIC"}
            </button>
          </div>

          {!isMobile && (
            <div className="flex-1 bg-[#2a241e] rounded border-2 border-[#4a3f35] overflow-hidden flex flex-col">
               <div className="bg-[#1a1512] px-2 py-0.5 border-b border-[#3d3128] flex justify-between items-center text-[7px] uppercase text-[#8b735b]">
                  <span>Vocal Signature</span>
               </div>
               <div className="flex-1 relative">
                  <Visualizer />
               </div>
            </div>
          )}
        </div>

        {/* Keyboard Container */}
        <div className="flex-1 bg-[#2a241e] rounded border-4 border-[#4a3f35] shadow-2xl overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 p-1 sm:p-4 bg-[#221c18] flex flex-col justify-center min-h-0 relative">
            <div 
              ref={keyboardScrollRef}
              className="flex overflow-x-auto overflow-y-hidden pb-8 scroll-smooth no-scrollbar"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className={`flex min-w-max items-start mx-auto bg-[#1a1512] p-1 sm:p-2 rounded shadow-inner ${isMobile ? 'h-[180px]' : 'h-[280px]'}`}>
                {PIANO_KEYS_61.map((note) => (
                  <div 
                    key={note.midi}
                    ref={el => { if (el) keyRefs.current.set(note.midi, el); }}
                    className="h-full"
                  >
                    <PianoKey
                      note={note}
                      isActive={activeNotes.has(note.midi)}
                      isVocalActive={detectedPitch?.note === note.midi}
                      isTarget={trackingMode === 'match' && targetMidi === note.midi}
                      isMobile={isMobile}
                      onMouseDown={handleNoteOn}
                      onMouseUp={handleNoteOff}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="absolute bottom-1.5 left-2 right-2 flex justify-between items-center text-[#8b735b] font-serif text-[7px] sm:text-[9px] uppercase tracking-[0.1em] italic">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 border border-[#8b735b] rotate-45 ${activeNotes.size > 0 || isMicActive ? 'bg-[#d4c5b3]' : ''}`}></span>
                {trackingMode === 'match' ? 'Match Mode' : isMicActive ? 'Follow Mode' : 'Ready'}
              </div>
              <div className="flex gap-3">
                <span>Active: {activeNotes.size}</span>
                {!isMobile && <span>Range: C2 - C7</span>}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Very small footer on mobile */}
      <footer className="py-1 px-4 text-center text-[7px] sm:text-[9px] text-[#5c4d3f] font-bold uppercase tracking-[0.2em] border-t border-[#2a241e] shrink-0">
        &bull; 1899 Newsies &bull; {isMobile ? 'TOUCH ENABLED' : 'DESKTOP'}
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
