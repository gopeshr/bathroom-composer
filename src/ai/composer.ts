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

export const generateArrangement = async (existingTracks: any[], genre?: string, complexity: number = 3): Promise<{ instrument: InstrumentType, notes: NoteEvent[] }[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not set in your .env.local file.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const genreInstruction = genre ? `\nCompose this arrangement in the style of: ${genre}.` : '';
  
  let complexityInstruction = '';
  switch(complexity) {
    case 1: complexityInstruction = "COMPLEXITY (1/5): Extremely sparse, minimal, and acoustic. Use very few notes, leave lots of empty space. Create a stripped-down, raw feeling."; break;
    case 2: complexityInstruction = "COMPLEXITY (2/5): Simple, relaxed arrangement. Focus on the core groove without overcomplicating it."; break;
    case 3: complexityInstruction = "COMPLEXITY (3/5): Standard, balanced arrangement. A good mix of rhythm and harmony."; break;
    case 4: complexityInstruction = "COMPLEXITY (4/5): Dense and energetic arrangement. Use more complex chord voicings and faster rhythmic subdivisions."; break;
    case 5: complexityInstruction = "COMPLEXITY (5/5): Massive, epic, and highly complex. Orchestral or heavily layered electronic. Fill the sonic spectrum with fast rhythms, sweeping arpeggios, and dense harmonies."; break;
  }

  const prompt = `
You are an expert, multi-platinum music producer and arranger.
I am providing you with the current state of a musical project. It consists of an array of tracks, where each track has an instrument and a sequence of MIDI notes. These notes are usually a raw, unquantized, and slightly messy vocal hum from the user.

Your task is to generate a pristine, professional musical arrangement based on this raw input.
${genreInstruction}
${complexityInstruction}

First, analyze the existing tracks in the "analysis" field. Determine the likely musical key, the implied tempo (BPM), the rhythmic motifs, and the overall mood based on ALL the provided tracks. 

Then, you MUST generate exactly 4 new tracks to build the arrangement. The instruments must be chosen from: 'piano', 'drums', 'guitar', 'flute', 'violin', 'bass', 'synth', 'choir', 'sax', 'trumpet', 'marimba'.

Track 1: THE CLEANED LEAD
The user's raw hum is messy. Your first track must be a "Cleaned Lead" (e.g., using 'synth', 'sax', 'flute', 'trumpet', or 'marimba'). This track must play the exact melody the user intended to hum, but mathematically quantized to the beat and perfectly pitch-corrected to the key. This is the most important track.

Track 2: BASS (Melodic Mirroring)
A bassline ('bass' or 'synth' playing low notes). The bassline MUST groove-lock with the user's melody. It should mirror the primary rhythmic motifs of the Cleaned Lead, providing a strong foundation that feels custom-tailored to the user's specific vocal rhythms.

Track 3: CHORDS
A chord progression ('piano', 'guitar', 'synth', or 'choir' playing chords). The chord changes should happen exactly on the accented notes of the user's hum, providing harmonic glue.

Track 4: DRUMS or COUNTER-MELODY (Call and Response)
Either a drum beat ('drums' using standard MIDI pitches: 36 Kick, 38 Snare, 42 Closed Hat, 46 Open Hat) where the kick locks with the bass... OR a counter-melody instrument. If you choose a counter-melody, it MUST perform "Call and Response". When the Cleaned Lead pauses or holds a long note, this track plays a quick lick to fill the space.

CRITICAL INSTRUCTION - DYNAMIC VELOCITY MAPPING:
You MUST strictly mirror the velocities (volume/amplitude) of the user's input tracks in your generated notes. If the user hummed softly (low velocity, e.g., 30-50) at a certain timestamp and swelled to a loud note (high velocity, e.g., 100-127), your arrangement MUST follow that exact dynamic envelope at that exact timestamp. Never use a flat velocity of 100 for all notes. Follow the emotional dynamics of the raw hum exactly.

Return ONLY valid JSON that matches the provided schema.

Existing Tracks Data (Raw User Input):
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
