import Soundfont from 'soundfont-player';
import * as Tone from 'tone';
import type { InstrumentType, Track } from '../store/useStore';

const instrumentMap: Record<InstrumentType, string> = {
  piano: 'acoustic_grand_piano',
  drums: 'synth_drum',
  guitar: 'acoustic_guitar_steel',
  flute: 'flute',
  violin: 'violin',
  bass: 'electric_bass_finger',
  synth: 'lead_2_sawtooth',
  choir: 'choir_aahs',
  sax: 'alto_sax',
  trumpet: 'trumpet',
  marimba: 'marimba'
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

  async renderTracksOffline(tracks: Track[], onProgress?: (p: number) => void): Promise<AudioBuffer> {
    let maxDuration = 0;
    const hasSolo = tracks.some(t => t.solo);
    
    tracks.forEach(track => {
      if (hasSolo && !track.solo) return;
      if (!hasSolo && track.muted) return;
      const trackMax = track.notes.reduce((max, note) => Math.max(max, note.startTime + note.duration), 0);
      if (trackMax > maxDuration) maxDuration = trackMax;
    });

    if (maxDuration === 0) throw new Error("No notes to render");

    maxDuration += 1.0; // 1 second tail
    const sampleRate = 44100;
    const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
      2, 
      Math.ceil(sampleRate * maxDuration), 
      sampleRate
    );

    if (onProgress) onProgress(10);
    const offlineInstruments: Map<string, any> = new Map();
    const activeTracks = tracks.filter(t => hasSolo ? t.solo : !t.muted);
    const neededInsts = new Set(activeTracks.map(t => instrumentMap[t.instrument]));
    
    let loadedCount = 0;
    for (const name of neededInsts) {
      const inst = await Soundfont.instrument(offlineCtx, name as any);
      offlineInstruments.set(name, inst);
      loadedCount++;
      if (onProgress) onProgress(10 + (loadedCount / neededInsts.size) * 40); // 10% to 50%
    }

    activeTracks.forEach(track => {
      const instName = instrumentMap[track.instrument];
      const activeInst = offlineInstruments.get(instName);
      if (!activeInst) return;

      track.notes.forEach(note => {
        activeInst.play(note.pitch, note.startTime, {
          duration: note.duration,
          gain: Math.min(2.0, track.volume * (note.velocity / 127) * 3.0)
        });
      });
    });

    if (onProgress) onProgress(60);
    
    // In some browsers offlineCtx rendering doesn't yield to the event loop, 
    // but startRendering() returns a promise.
    const renderedBuffer = await offlineCtx.startRendering();
    if (onProgress) onProgress(100);
    
    return renderedBuffer;
  }
}

export const synthEngine = new SynthEngine();
