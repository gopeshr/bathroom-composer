import type { NoteEvent } from '../store/useStore';

export const quantizeNotes = (
  notes: NoteEvent[],
  bpm: number = 120,
  gridResolution: number = 0.25 // 16th notes by default (0.25 of a beat)
): NoteEvent[] => {
  const secondsPerBeat = 60 / bpm;
  const gridStepSeconds = secondsPerBeat * gridResolution;

  // 1. Noise Gate: filter out extremely short or quiet notes
  const filteredNotes = notes.filter(n => n.duration >= 0.05 && n.velocity > 10);

  // 2. Snap to Grid
  const quantizedNotes = filteredNotes.map(n => {
    // Snap start time to nearest grid step
    const snappedStart = Math.round(n.startTime / gridStepSeconds) * gridStepSeconds;
    
    // Snap duration to nearest grid step, minimum 1 grid step
    let snappedDuration = Math.round(n.duration / gridStepSeconds) * gridStepSeconds;
    if (snappedDuration < gridStepSeconds) {
      snappedDuration = gridStepSeconds;
    }

    return {
      ...n,
      startTime: snappedStart,
      duration: snappedDuration
    };
  });

  return quantizedNotes;
};
