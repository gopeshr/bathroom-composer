import React from 'react';
import { Volume2, VolumeX, Trash2, Headphones } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { InstrumentType } from '../store/useStore';

const INSTRUMENTS: InstrumentType[] = ['piano', 'drums', 'guitar', 'flute', 'violin'];

export const TrackList: React.FC = () => {
  const tracks = useStore(state => state.tracks);
  const updateTrack = useStore(state => state.updateTrack);
  const removeTrack = useStore(state => state.removeTrack);

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 border-2 border-dashed border-surface-border rounded-xl">
        <p className="text-lg mb-2">No tracks yet</p>
        <p className="text-sm">Tap the microphone to record your first hum!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tracks.map(track => (
        <div key={track.id} className="glass-panel p-4 flex items-center gap-4 transition-all hover:bg-surface-card/90">
          {/* Color Indicator */}
          <div className="w-2 h-12 rounded-full" style={{ backgroundColor: track.color }} />
          
          <div className="flex-1">
            <input 
              type="text" 
              value={track.name}
              onChange={(e) => updateTrack(track.id, { name: e.target.value })}
              className="bg-transparent border-none outline-none text-white font-medium text-lg w-full mb-1"
            />
            
            <div className="flex items-center gap-2">
              <select 
                value={track.instrument}
                onChange={(e) => updateTrack(track.id, { instrument: e.target.value as InstrumentType })}
                className="bg-surface-dark border border-surface-border rounded text-sm text-slate-300 px-2 py-1 outline-none focus:border-primary-500"
              >
                {INSTRUMENTS.map(inst => (
                  <option key={inst} value={inst}>{inst.charAt(0).toUpperCase() + inst.slice(1)}</option>
                ))}
              </select>
              <div className="text-xs text-slate-500">{track.notes.length} notes</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Volume Slider */}
            <div className="flex items-center gap-1">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <input 
                type="range" 
                min="0" max="1" step="0.01"
                value={track.volume}
                onChange={(e) => updateTrack(track.id, { volume: parseFloat(e.target.value) })}
                className="w-20 accent-primary-500"
              />
            </div>

            {/* Mute Button */}
            <button 
              onClick={() => updateTrack(track.id, { muted: !track.muted })}
              className={`p-2 rounded-full transition-colors ${track.muted ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-slate-400'}`}
              title="Mute"
            >
              <VolumeX className="w-4 h-4" />
            </button>

            {/* Solo Button */}
            <button 
              onClick={() => updateTrack(track.id, { solo: !track.solo })}
              className={`p-2 rounded-full transition-colors ${track.solo ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/10 text-slate-400'}`}
              title="Solo"
            >
              <Headphones className="w-4 h-4" />
            </button>

            {/* Delete Button */}
            <button 
              onClick={() => removeTrack(track.id)}
              className="p-2 rounded-full hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-colors ml-2"
              title="Delete Track"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
