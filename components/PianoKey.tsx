
import React from 'react';
import { Note } from '../types';

interface PianoKeyProps {
  note: Note;
  isActive: boolean;
  isVocalActive?: boolean;
  isTarget?: boolean;
  isMobile?: boolean;
  onMouseDown: (midi: number) => void;
  onMouseUp: (midi: number) => void;
}

export const PianoKey: React.FC<PianoKeyProps> = ({ 
  note, 
  isActive, 
  isVocalActive = false, 
  isTarget = false,
  isMobile = false,
  onMouseDown, 
  onMouseUp 
}) => {
  const baseClasses = "transition-all duration-75 select-none relative flex flex-col items-center justify-end pb-2 sm:pb-4 touch-none";
  
  if (note.isBlack) {
    const blackKeyBg = isActive 
      ? 'bg-[#d4c5b3] translate-y-0.5 shadow-[0_0_12px_rgba(212,197,179,0.8)]' 
      : isTarget
        ? 'bg-[#8b735b] border-[#d4c5b3] shadow-[0_0_15px_rgba(212,197,179,0.4)]'
        : isVocalActive 
          ? 'bg-[#4a3f35] translate-y-0.2 shadow-[0_0_8px_rgba(139,115,91,0.4)]' 
          : 'bg-[#121212] hover:bg-[#1a1a1a] shadow-[1px_2px_5px_rgba(0,0,0,0.8)]';

    const widthClass = isMobile ? 'w-5 -mx-2.5' : 'w-7 -mx-3.5';
    const heightClass = isMobile ? 'h-14' : 'h-24';

    return (
      <div
        onMouseDown={(e) => { e.preventDefault(); onMouseDown(note.midi); }}
        onMouseUp={(e) => { e.preventDefault(); onMouseUp(note.midi); }}
        onMouseLeave={() => isActive && onMouseUp(note.midi)}
        onTouchStart={(e) => { e.preventDefault(); onMouseDown(note.midi); }}
        onTouchEnd={(e) => { e.preventDefault(); onMouseUp(note.midi); }}
        className={`${baseClasses} ${widthClass} ${heightClass} z-10 rounded-b-sm border-x border-b border-[#000] cursor-pointer
          ${blackKeyBg} 
          before:absolute before:top-0 before:left-0.5 before:right-0.5 before:h-1 sm:before:h-2 before:bg-white/5`}
      >
        {!isMobile && (
          <span className={`typewriter text-[5px] sm:text-[6px] font-bold mb-1 opacity-60 ${isActive || isTarget ? 'text-[#1c1917]' : 'text-[#8b735b]'}`}>
            {note.name}
          </span>
        )}
      </div>
    );
  }

  const whiteKeyBg = isActive 
    ? 'bg-[#d4c5b3] translate-y-1 sm:translate-y-1.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.2),0_0_15px_rgba(212,197,179,0.4)]' 
    : isTarget
      ? 'bg-[#fdf6e3] ring-1 sm:ring-2 ring-inset ring-[#d4c5b3] shadow-[0_0_20px_rgba(212,197,179,0.5)]'
      : isVocalActive
        ? 'bg-[#e5ddd0] translate-y-0.2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1),0_0_10px_rgba(139,115,91,0.2)]'
        : 'hover:bg-[#fff9eb] shadow-[0_2px_4px_rgba(0,0,0,0.2)]';

  const whiteKeyTextColor = isActive || isTarget ? 'text-[#1c1917]' : 'text-[#8b735b]';
  const widthClass = isMobile ? 'w-7 sm:w-11' : 'w-11';
  const heightClass = isMobile ? 'h-24 sm:h-40' : 'h-40';

  return (
    <div
      onMouseDown={(e) => { e.preventDefault(); onMouseDown(note.midi); }}
      onMouseUp={(e) => { e.preventDefault(); onMouseUp(note.midi); }}
      onMouseLeave={() => isActive && onMouseUp(note.midi)}
      onTouchStart={(e) => { e.preventDefault(); onMouseDown(note.midi); }}
      onTouchEnd={(e) => { e.preventDefault(); onMouseUp(note.midi); }}
      className={`${baseClasses} ${widthClass} ${heightClass} bg-[#fdf6e3] border-x border-b border-[#dcd3bc] rounded-b-sm cursor-pointer
        ${whiteKeyBg}
        after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 sm:after:h-1 after:bg-black/5`}
    >
      <span className={`typewriter text-[6px] sm:text-[9px] font-bold tracking-tighter ${whiteKeyTextColor}`}>
        {note.name}
      </span>
      {isVocalActive && !isActive && (
        <div className="absolute bottom-1 sm:bottom-2 w-1 sm:w-1.5 h-1 sm:h-1.5 bg-[#8b735b] rotate-45 animate-pulse"></div>
      )}
    </div>
  );
};
