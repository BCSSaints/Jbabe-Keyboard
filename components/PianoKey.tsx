
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
        className={`${baseClasses} w-7 h-28 -mx-3.5 z-10 rounded-b-md border-x border-b border-black cursor-pointer
          ${isActive ? 'bg-blue-500 scale-y-95' : 'bg-[#1a1a1a] hover:bg-[#2a2a2a] shadow-xl'}`}
      >
        <span className="text-[7px] text-white/20 font-bold mb-1">{note.name}</span>
      </div>
    );
  }

  return (
    <div
      onMouseDown={() => onMouseDown(note.midi)}
      onMouseUp={() => onMouseUp(note.midi)}
      onMouseLeave={() => isActive && onMouseUp(note.midi)}
      className={`${baseClasses} w-11 h-44 bg-white border-x border-b border-neutral-200 rounded-b-lg cursor-pointer
        ${isActive ? 'bg-blue-50 shadow-inner translate-y-1' : 'hover:bg-neutral-50 shadow-md'}`}
    >
      <span className="text-[9px] text-neutral-300 font-bold tracking-tighter">{note.name}</span>
    </div>
  );
};
