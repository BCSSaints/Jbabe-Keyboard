
import React from 'react';
import { Note } from '../types';

interface PianoKeyProps {
  note: Note;
  isActive: boolean;
  onMouseDown: (midi: number) => void;
  onMouseUp: (midi: number) => void;
}

export const PianoKey: React.FC<PianoKeyProps> = ({ note, isActive, onMouseDown, onMouseUp }) => {
  const baseClasses = "transition-all duration-75 select-none relative flex flex-col items-center justify-end pb-4";
  
  if (note.isBlack) {
    return (
      <div
        onMouseDown={() => onMouseDown(note.midi)}
        onMouseUp={() => onMouseUp(note.midi)}
        onMouseLeave={() => isActive && onMouseUp(note.midi)}
        className={`${baseClasses} w-7 h-24 -mx-3.5 z-10 rounded-b-sm border-x border-b border-[#000] cursor-pointer
          ${isActive ? 'bg-[#4a3f35] translate-y-0.5' : 'bg-[#121212] hover:bg-[#1a1a1a] shadow-[2px_4px_8px_rgba(0,0,0,0.8)]'} 
          before:absolute before:top-0 before:left-1 before:right-1 before:h-2 before:bg-white/5`}
      >
        <span className="typewriter text-[6px] text-[#8b735b] font-bold mb-1 opacity-40">{note.name}</span>
      </div>
    );
  }

  return (
    <div
      onMouseDown={() => onMouseDown(note.midi)}
      onMouseUp={() => onMouseUp(note.midi)}
      onMouseLeave={() => isActive && onMouseUp(note.midi)}
      className={`${baseClasses} w-10 sm:w-11 h-40 bg-[#fdf6e3] border-x border-b border-[#dcd3bc] rounded-b-sm cursor-pointer
        ${isActive ? 'bg-[#d9b891] translate-y-1.5 shadow-inner' : 'hover:bg-[#fff9eb] shadow-[0_4px_4px_rgba(0,0,0,0.2)]'}
        after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-black/5`}
    >
      <span className="typewriter text-[9px] text-[#8b735b] font-bold tracking-tighter">{note.name}</span>
    </div>
  );
};
