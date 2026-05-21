import { GoogleGenAI, Type } from '@google/genai';
import type { NoteEvent, InstrumentType } from '../store/useStore';

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    analysis: {
      type: Type.STRING,
      description: 'Your chain-of-thought analysis of the lead melody (key, tempo, mood) and your arrangement strategy.'
    },
    tracks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          instrument: {
            type: Type.STRING,
            enum: ['piano', 'drums', 'guitar', 'flute', 'violin', 'bass', 'synth', 'choir', 'sax', 'trumpet', 'marimba'],
            description: 'The instrument for this track'
          },
          notes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pitch: { type: Type.INTEGER, description: 'MIDI pitch (0-127)' },
                startTime: { type: Type.NUMBER, description: 'Start time in seconds' },
                duration: { type: Type.NUMBER, description: 'Duration in seconds' },
                velocity: { type: Type.INTEGER, description: 'Note velocity (0-127)' }
              },
              required: ['pitch', 'startTime', 'duration', 'velocity']
            }
          }
        },
        required: ['instrument', 'notes']
      }
    }
  },
  required: ['analysis', 'tracks']
};

export const generateArrangement = async (existingTracks: any[], genre?: string): Promise<{ instrument: InstrumentType, notes: NoteEvent[] }[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not set in your .env.local file.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const genreInstruction = genre ? `\nCompose this arrangement in the style of: ${genre}.` : '';

  const prompt = `
You are an expert, multi-platinum music producer and arranger.
I am providing you with the current state of a musical project. It consists of an array of tracks, where each track has an instrument and a sequence of MIDI notes.

Your task is to generate additional musical tracks to complement and arrange this project.
${genreInstruction}

First, analyze the existing tracks in the "analysis" field. Determine the likely musical key, the implied tempo (BPM), and the overall mood based on ALL the provided tracks. Then, compose new tracks based on that analysis to build out the arrangement.

Create exactly 3 additional tracks from this list of available instruments: 'piano', 'drums', 'guitar', 'flute', 'violin', 'bass', 'synth', 'choir', 'sax', 'trumpet', 'marimba'.

1. A bassline (instrument: 'bass' or 'synth' playing low notes).
2. A chord progression (instrument: 'piano', 'guitar', 'synth', or 'choir' playing chords).
3. A drum beat (instrument: 'drums'. Use standard MIDI drum pitches: 36 for Kick, 38 for Snare, 42 for Closed Hi-hat, 46 for Open Hi-hat).
Or, you can use other melodic instruments ('flute', 'violin', 'sax', 'trumpet', 'marimba') to provide counter-melodies or textural layers instead of the strict bass/chords/drums format, if it fits the requested genre better.

Crucially, humanize the performance. Vary the 'velocity' of the notes to create groove and dynamics. For example, emphasize the downbeats, use softer 'ghost notes' on the snare, and give the piano chords a natural dynamic arc.

Ensure structural synergy. The bassline rhythm MUST lock in tightly with the kick drum pattern. The chord progression should provide a rhythmic counterpoint to the existing melodies without clashing harmonically.

Make sure the arrangement is perfectly synchronized with the existing tracks' timing. Return ONLY valid JSON that matches the provided schema.

Existing Tracks Data:
${JSON.stringify(existingTracks.map(t => ({ instrument: t.instrument, notes: t.notes })), null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.5,
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.tracks as { instrument: InstrumentType, notes: NoteEvent[] }[];
    }
    return [];
  } catch (error) {
    console.error('Failed to generate arrangement:', error);
    throw error;
  }
};
