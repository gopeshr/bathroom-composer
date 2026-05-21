import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateArrangement } from '../ai/composer';
import type { InstrumentType } from '../store/useStore';

const INSTRUMENT_COLORS: Record<InstrumentType, string> = {
  piano: '#3b82f6',
  drums: '#ef4444',
  guitar: '#eab308',
  flute: '#10b981',
  violin: '#8b5cf6',
  bass: '#f97316',
  synth: '#ec4899',
  choir: '#0ea5e9',
  sax: '#d946ef',
  trumpet: '#eab308',
  marimba: '#14b8a6'
};

export const AIArrangeButton: React.FC = () => {
  const tracks = useStore(state => state.tracks);
  const addTrack = useStore(state => state.addTrack);
  const [isGenerating, setIsGenerating] = useState(false);

  const [genre, setGenre] = useState('');

  const handleArrange = async () => {
    if (tracks.length === 0) return;

    setIsGenerating(true);
    try {
      const generatedTracks = await generateArrangement(tracks, genre);
      
      generatedTracks.forEach((t, i) => {
        addTrack({
          name: `AI ${t.instrument.charAt(0).toUpperCase() + t.instrument.slice(1)}`,
          instrument: t.instrument,
          notes: t.notes,
          muted: false,
          solo: false,
          volume: 0.8,
          color: INSTRUMENT_COLORS[t.instrument] || '#94a3b8'
        });
      });
      
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to generate arrangement.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (tracks.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder="Genre/Vibe (e.g. Lo-Fi, Jazz)"
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
        disabled={isGenerating}
        className="glass-panel px-3 py-2 text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-accent-pink/50 rounded-lg placeholder:text-slate-500 min-w-[200px]"
      />
      <button
        onClick={handleArrange}
        disabled={isGenerating}
        className="glass-button px-4 py-2 flex items-center gap-2 text-sm font-semibold text-accent-pink hover:text-white transition-colors"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {isGenerating ? "AI Composing..." : "Auto-Arrange with AI"}
      </button>
    </div>
  );
};
