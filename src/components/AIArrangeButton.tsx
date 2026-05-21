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
};

export const AIArrangeButton: React.FC = () => {
  const tracks = useStore(state => state.tracks);
  const addTrack = useStore(state => state.addTrack);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleArrange = async () => {
    if (tracks.length === 0) return;
    
    // Use the first track as the lead melody
    const leadTrack = tracks[0];
    
    if (leadTrack.notes.length === 0) {
      alert("The lead track has no notes. Hum something first!");
      return;
    }

    setIsGenerating(true);
    try {
      const generatedTracks = await generateArrangement(leadTrack.notes);
      
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
  );
};
