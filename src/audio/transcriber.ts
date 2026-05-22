import * as tf from '@tensorflow/tfjs';
import { BasicPitch, outputToNotesPoly, noteFramesToTime } from '@spotify/basic-pitch';
import type { NoteEventTime } from '@spotify/basic-pitch';

let basicPitchInstance: BasicPitch | null = null;

export const initTranscriber = async () => {
  if (!basicPitchInstance) {
    try {
      await tf.setBackend('cpu');
    } catch (e) {
      console.warn("Could not set CPU backend for TFJS:", e);
    }
    basicPitchInstance = new BasicPitch('/model/model.json');
  }
};

export const transcribeAudio = async (
  audioBuffer: AudioBuffer,
  onProgress?: (p: number) => void
): Promise<NoteEventTime[]> => {
  await initTranscriber();

  return new Promise((resolve, reject) => {
    const frames: number[][] = [];
    const onsets: number[][] = [];
    const contours: number[][] = [];

    basicPitchInstance!.evaluateModel(
      audioBuffer,
      (f, o, c) => {
        frames.push(...f);
        onsets.push(...o);
        contours.push(...c);
      },
      (percent) => {
        if (onProgress) onProgress(percent);
      }
    )
      .then(() => {
        const notesPoly = outputToNotesPoly(frames, onsets);
        const notesTime = noteFramesToTime(notesPoly);
        resolve(notesTime);
      })
      .catch(reject);
  });
};
