import { create } from 'zustand';

export type InstrumentType = 'piano' | 'drums' | 'guitar' | 'flute' | 'violin' | 'bass' | 'synth' | 'choir' | 'sax' | 'trumpet' | 'marimba';

export interface NoteEvent {
  pitch: number;      // MIDI pitch
  startTime: number;  // In seconds
  duration: number;   // In seconds
  velocity: number;   // 0 to 127
}

export interface Track {
  id: string;
  name: string;
  instrument: InstrumentType;
  notes: NoteEvent[];
  muted: boolean;
  solo: boolean;
  volume: number;     // 0 to 1
  color: string;
}

interface AppState {
  tracks: Track[];
  isPlaying: boolean;
  currentTime: number;
  tempo: number;      // BPM
  addTrack: (track: Omit<Track, 'id'>) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  clearAll: () => void;
}

export const useStore = create<AppState>((set) => ({
  tracks: [],
  isPlaying: false,
  currentTime: 0,
  tempo: 120,
  
  addTrack: (trackData) => set((state) => ({
    tracks: [...state.tracks, { ...trackData, id: Math.random().toString(36).substring(2, 9) }]
  })),
  
  removeTrack: (id) => set((state) => ({
    tracks: state.tracks.filter(t => t.id !== id)
  })),
  
  updateTrack: (id, updates) => set((state) => ({
    tracks: state.tracks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  
  setPlaying: (isPlaying) => set({ isPlaying }),
  
  setCurrentTime: (currentTime) => set({ currentTime }),
  
  clearAll: () => set({ tracks: [], currentTime: 0, isPlaying: false })
}));
