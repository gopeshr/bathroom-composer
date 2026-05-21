import { BasicPitch, outputToNotesPoly, noteFramesToTime } from '@spotify/basic-pitch';
import type { NoteEventTime } from '@spotify/basic-pitch';

let basicPitchInstance: BasicPitch | null = null;

export const initTranscriber = () => {
  if (!basicPitchInstance) {
    basicPitchInstance = new BasicPitch('/model/model.json');
  }
};

export const transcribeAudio = async (
  audioBuffer: AudioBuffer,
  onProgress?: (p: number) => void
): Promise<NoteEventTime[]> => {
  initTranscriber();

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
