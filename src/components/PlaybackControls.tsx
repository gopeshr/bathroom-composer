import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Download, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { synthEngine } from '../audio/synth';
import * as Tone from 'tone';
import MidiWriter from 'midi-writer-js';
// @ts-ignore
import lamejs from 'lamejs';

export const PlaybackControls: React.FC = () => {
  const tracks = useStore(state => state.tracks);
  const isPlaying = useStore(state => state.isPlaying);
  const setPlaying = useStore(state => state.setPlaying);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  useEffect(() => {
    // Initial load of default instruments
    const loadInstruments = async () => {
      const needed = new Set(tracks.map(t => t.instrument));
      for (const inst of needed) {
        await synthEngine.loadInstrument(inst);
      }
    };
    loadInstruments();
  }, [tracks]);

  const handlePlayStop = async () => {
    if (isPlaying) {
      synthEngine.stopAll();
      setPlaying(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      await Tone.start();
      setPlaying(true);
      
      const startTime = Tone.getContext().rawContext.currentTime + 0.1;
      let maxDuration = 0;

      // Handle solo logic
      const hasSolo = tracks.some(t => t.solo);
      
      tracks.forEach(track => {
        if (hasSolo && !track.solo) return;
        if (!hasSolo && track.muted) return;
        
        synthEngine.playTrack(track, startTime);
        
        // Calculate max duration to stop playing
        const trackMax = track.notes.reduce((max, note) => Math.max(max, note.startTime + note.duration), 0);
        if (trackMax > maxDuration) maxDuration = trackMax;
      });

      timeoutRef.current = setTimeout(() => {
        setPlaying(false);
      }, maxDuration * 1000 + 500);
    }
  };

  const handleExportMidi = () => {
    // Export to MIDI
    const midiTracks = tracks.map(track => {
      const midiTrack = new MidiWriter.Track();
      midiTrack.addEvent(new (MidiWriter as any).ProgramChangeEvent({instrument: 1})); // Simple mapping, refine later
      
      track.notes.forEach(note => {
        midiTrack.addEvent(new MidiWriter.NoteEvent({
          pitch: note.pitch,
          duration: 'T' + Math.round(note.duration * 128), // Rough duration mapped to ticks
          wait: 'T' + Math.round(note.startTime * 128), // Rough wait mapped to ticks
          velocity: note.velocity
        }));
      });
      return midiTrack;
    });

    const write = new MidiWriter.Writer(midiTracks);
    const dataUri = write.dataUri();
    
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = 'composition.mid';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const audioBufferToMp3Blob = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128); // 128kbps
    const mp3Data: Int8Array[] = [];

    const left = buffer.getChannelData(0);
    const right = numChannels > 1 ? buffer.getChannelData(1) : left;

    const sampleBlockSize = 1152; // LAME block size
    const leftInt16 = new Int16Array(left.length);
    const rightInt16 = new Int16Array(right.length);

    // Convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
    for (let i = 0; i < left.length; i++) {
      let l = left[i] * 32767.5;
      let r = right[i] * 32767.5;
      leftInt16[i] = l < -32768 ? -32768 : l > 32767 ? 32767 : Math.round(l);
      rightInt16[i] = r < -32768 ? -32768 : r > 32767 ? 32767 : Math.round(r);
    }

    for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
      const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
  };

  const handleExportAudio = async () => {
    if (isPlaying || isRendering) return;
    setIsRendering(true);
    setRenderProgress(0);

    try {
      // Step 1: Render the tracks offline mathematically instantly
      const renderedBuffer = await synthEngine.renderTracksOffline(tracks, (p) => {
        setRenderProgress(Math.floor(p)); // 0 to 100% of synth rendering
      });

      // Step 2: Encode to MP3
      setRenderProgress(100);
      
      // Use setTimeout to allow UI to update to 100% before locking thread for MP3 encoding
      setTimeout(() => {
        const mp3Blob = audioBufferToMp3Blob(renderedBuffer);
        const url = URL.createObjectURL(mp3Blob);
        
        // Trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = 'bathroom-composer-track.mp3';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setIsRendering(false);
      }, 50);

    } catch (err) {
      console.error(err);
      alert("Failed to render audio");
      setIsRendering(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button 
        onClick={handlePlayStop}
        disabled={tracks.length === 0 || isRendering}
        className="glass-button w-14 h-14 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPlaying ? <Square className="w-6 h-6 text-red-400 fill-current" /> : <Play className="w-6 h-6 text-green-400 ml-1 fill-current" />}
      </button>

      <button 
        onClick={handleExportMidi}
        disabled={tracks.length === 0 || isRendering}
        className="glass-button px-6 h-12 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        MIDI
      </button>

      <button 
        onClick={handleExportAudio}
        disabled={tracks.length === 0 || isPlaying || isRendering}
        className="glass-button px-6 h-12 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
      >
        {isRendering ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-accent-pink" />
            <span className="text-accent-pink">Rendering {renderProgress}%</span>
            <div 
              className="absolute bottom-0 left-0 h-1 bg-accent-pink transition-all duration-300"
              style={{ width: `${renderProgress}%` }}
            />
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            MP3
          </>
        )}
      </button>
    </div>
  );
};
