import React, { useEffect, useRef } from 'react';
import { Play, Square, Download } from 'lucide-react';
import { useStore } from '../store/useStore';
import { synthEngine } from '../audio/synth';
import * as Tone from 'tone';
import MidiWriter from 'midi-writer-js';

export const PlaybackControls: React.FC = () => {
  const tracks = useStore(state => state.tracks);
  const isPlaying = useStore(state => state.isPlaying);
  const setPlaying = useStore(state => state.setPlaying);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleExportAudio = async () => {
    if (isPlaying) return;
    
    // Set up a MediaRecorder to capture Tone.Destination
    const dest = Tone.getDestination();
    const stream = dest.context.createMediaStreamDestination();
    dest.connect(stream);
    
    const recorder = new MediaRecorder(stream.stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'composition.webm';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      dest.disconnect(stream);
    };

    recorder.start();
    await handlePlayStop(); // Play the composition
    
    // Calculate total duration to stop recording
    let maxDuration = 0;
    tracks.forEach(track => {
      const trackMax = track.notes.reduce((max, note) => Math.max(max, note.startTime + note.duration), 0);
      if (trackMax > maxDuration) maxDuration = trackMax;
    });

    setTimeout(() => {
      recorder.stop();
    }, maxDuration * 1000 + 1000);
  };

  return (
    <div className="flex items-center gap-4">
      <button 
        onClick={handlePlayStop}
        disabled={tracks.length === 0}
        className="glass-button w-14 h-14 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPlaying ? <Square className="w-6 h-6 text-red-400 fill-current" /> : <Play className="w-6 h-6 text-green-400 ml-1 fill-current" />}
      </button>

      <button 
        onClick={handleExportMidi}
        disabled={tracks.length === 0}
        className="glass-button px-6 h-12 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        MIDI
      </button>

      <button 
        onClick={handleExportAudio}
        disabled={tracks.length === 0 || isPlaying}
        className="glass-button px-6 h-12 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        Audio
      </button>
    </div>
  );
};
