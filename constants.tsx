
import { Note } from './types';

export const PIANO_KEYS_61: Note[] = [];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// 61-key standard: C2 (36) to C7 (96)
for (let i = 36; i <= 96; i++) {
  const nameIndex = i % 12;
  const octave = Math.floor(i / 12) - 1;
  const name = NOTE_NAMES[nameIndex];
  PIANO_KEYS_61.push({
    midi: i,
    name: `${name}${octave}`,
    isBlack: name.includes('#')
  });
}

export const COMPUTER_KEYBOARD_MAP: Record<string, number> = {
  'a': 60, // C4
  'w': 61,
  's': 62,
  'e': 63,
  'd': 64,
  'f': 65,
  't': 66,
  'g': 67,
  'y': 68,
  'h': 69,
  'u': 70,
  'j': 71,
  'k': 72, // C5
  'o': 73,
  'l': 74,
  'p': 75,
  ';': 76
};
