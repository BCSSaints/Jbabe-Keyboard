
import React from 'react';
import { Note } from '../types';

interface PianoKeyProps {
  note: Note;
  isActive: boolean;
  isVocalActive?: boolean;
  onMouseDown: (midi: number) => void;
  onMouseUp: (midi: number) => void;
}

export const PianoKey: React.FC<PianoKeyProps> = ({ 
  note, 
  isActive, 
  isVocalActive = false, 
  onMouseDown, 
  onMouseUp 
}) => {
  const baseClasses = "transition-all duration-75 select-none relative flex flex-col items-center justify-end pb-4";
  
  // Combine states for styling
  // isActive: manually pressed (Keyboard/Mouse)
  // isVocalActive: matched by microphone pitch
  
  if (note.isBlack) {
    const blackKeyBg = isActive 
      ? 'bg-[#d4c5b3] translate-y-0.5 shadow-[0_0_15px_rgba(212,197,179,0.8)]' 
      : isVocalActive 
        ? 'bg-[#8b735b] translate-y-0.2 shadow-[0_0_20px_rgba(139,115,91,0.6)]' 
        : 'bg-[#121212] hover:bg-[#1a1a1a] shadow-[2px_4px_8px_rgba(0,0,0,0.8)]';

    return (
      <div
        onMouseDown={() => onMouseDown(note.midi)}
        onMouseUp={() => onMouseUp(note.midi)}
        onMouseLeave={() => isActive && onMouseUp(note.midi)}
        className={`${baseClasses} w-6 sm:w-7 h-16 sm:h-24 -mx-3 sm:-mx-3.5 z-10 rounded-b-sm border-x border-b border-[#000] cursor-pointer
          ${blackKeyBg} 
          before:absolute before:top-0 before:left-1 before:right-1 before:h-2 before:bg-white/5`}
      >
        <span className={`typewriter text-[5px] sm:text-[6px] font-bold mb-1 opacity-60 ${isActive || isVocalActive ? 'text-[#1c1917]' : 'text-[#8b735b]'}`}>
          {note.name}
        </span>
      </div>
    );
  }

  const whiteKeyBg = isActive 
    ? 'bg-[#d4c5b3] translate-y-1.5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.2),0_0_20px_rgba(212,197,179,0.4)]' 
    : isVocalActive
      ? 'bg-[#e5ddd0] translate-y-0.5 shadow-[inset_0_2px_5px_rgba(0,0,0,0.1),0_0_25px_rgba(139,115,91,0.3)]'
      : 'hover:bg-[#fff9eb] shadow-[0_4px_4px_rgba(0,0,0,0.2)]';

  const whiteKeyTextColor = isActive || isVocalActive ? 'text-[#1c1917]' : 'text-[#8b735b]';

  return (
    <div
      onMouseDown={() => onMouseDown(note.midi)}
      onMouseUp={() => onMouseUp(note.midi)}
      onMouseLeave={() => isActive && onMouseUp(note.midi)}
      className={`${baseClasses} w-8 sm:w-11 h-28 sm:h-40 bg-[#fdf6e3] border-x border-b border-[#dcd3bc] rounded-b-sm cursor-pointer
        ${whiteKeyBg}
        after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-black/5`}
    >
      <span className={`typewriter text-[7px] sm:text-[9px] font-bold tracking-tighter ${whiteKeyTextColor}`}>
        {note.name}
      </span>
      {isVocalActive && !isActive && (
        <div className="absolute bottom-2 w-1.5 h-1.5 bg-[#8b735b] rotate-45 animate-pulse"></div>
      )}
    </div>
  );
};
