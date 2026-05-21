import Soundfont from 'soundfont-player';
import * as Tone from 'tone';
import type { InstrumentType, Track } from '../store/useStore';

const instrumentMap: Record<InstrumentType, string> = {
  piano: 'acoustic_grand_piano',
  drums: 'synth_drum',
  guitar: 'acoustic_guitar_steel',
  flute: 'flute',
  violin: 'violin'
};

class SynthEngine {
  private instruments: Map<string, any> = new Map();
  private audioContext: AudioContext;
  
  constructor() {
    this.audioContext = Tone.getContext().rawContext as AudioContext;
  }

  async loadInstrument(type: InstrumentType) {
    const name = instrumentMap[type];
    if (this.instruments.has(name)) return;
    // Load the instrument
    const inst = await Soundfont.instrument(this.audioContext, name as any);
    this.instruments.set(name, inst);
  }

  async playTrack(track: Track, startTime: number) {
    if (track.muted) return;
    const instName = instrumentMap[track.instrument];
    const inst = this.instruments.get(instName);
    
    if (!inst) {
      await this.loadInstrument(track.instrument);
    }
    
    const activeInst = this.instruments.get(instName);
    if (!activeInst) return;

    // Map notes to Soundfont-player format
    // Tone.Transport time vs audioContext time:
    // We will schedule based on audioContext.currentTime to keep it simple,
    // or use Tone.Draw / Transport. We'll use absolute time.
    track.notes.forEach(note => {
      // Schedule note based on the absolute start time
      const playTime = startTime + note.startTime;
      
      activeInst.play(note.pitch, playTime, {
        duration: note.duration,
        // Boost volume by 3x since basic-pitch amplitudes can be quiet
        gain: Math.min(2.0, track.volume * (note.velocity / 127) * 3.0)
      });
    });
  }

  stopAll() {
    this.instruments.forEach(inst => {
      if (inst.stop) inst.stop();
    });
  }
}

export const synthEngine = new SynthEngine();
