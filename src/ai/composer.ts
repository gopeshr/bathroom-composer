import { GoogleGenAI, Type } from '@google/genai';
import type { Note, InstrumentType } from '../store/useStore';

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
            enum: ['piano', 'drums', 'guitar', 'flute', 'violin'],
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

export const generateArrangement = async (leadNotes: Note[], genre?: string): Promise<{ instrument: InstrumentType, notes: Note[] }[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not set in your .env.local file.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const genreInstruction = genre ? `\nCompose this arrangement in the style of: ${genre}.` : '';

  const prompt = `
You are an expert, multi-platinum music producer and arranger.
I am providing you with a lead melody consisting of a sequence of MIDI notes (pitch, startTime in seconds, duration in seconds, and velocity).

Your task is to generate a full musical arrangement to accompany this melody.
${genreInstruction}

First, analyze the lead melody in the "analysis" field. Determine the likely musical key, the implied tempo (BPM), and the overall mood. Then, compose the tracks based on that analysis.

Create exactly 3 additional tracks:
1. A bassline (instrument: 'guitar' or 'piano' playing low notes, e.g., MIDI pitches 30-45).
2. A chord progression (instrument: 'piano' or 'guitar' playing chords).
3. A drum beat (instrument: 'drums'. Use standard MIDI drum pitches: 36 for Kick, 38 for Snare, 42 for Closed Hi-hat, 46 for Open Hi-hat).

Crucially, humanize the performance. Vary the 'velocity' of the notes to create groove and dynamics. For example, emphasize the downbeats, use softer 'ghost notes' on the snare, and give the piano chords a natural dynamic arc.

Ensure structural synergy. The bassline rhythm MUST lock in tightly with the kick drum pattern. The chord progression should provide a rhythmic counterpoint to the lead melody without clashing harmonically.

Make sure the arrangement is perfectly synchronized with the lead melody's timing. Return ONLY valid JSON that matches the provided schema.

Lead Melody Notes:
${JSON.stringify(leadNotes, null, 2)}
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
      return data.tracks as { instrument: InstrumentType, notes: Note[] }[];
    }
    return [];
  } catch (error) {
    console.error('Failed to generate arrangement:', error);
    throw error;
  }
};
