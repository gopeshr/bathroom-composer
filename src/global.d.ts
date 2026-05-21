declare module 'soundfont-player' {
  export function instrument(ac: AudioContext, name: string, options?: any): Promise<any>;
}

declare module 'midi-writer-js' {
  export class Track {
    addEvent(events: any | any[], mapFunction?: any): Track;
    setTempo(tempo: number): void;
  }
  
  export class NoteEvent {
    constructor(options: { pitch: number | number[] | string | string[], duration: string | number, wait?: string | number, velocity?: number });
  }
  
  export class Writer {
    constructor(tracks: Track | Track[]);
    buildFile(): Uint8Array;
    dataUri(): string;
  }
}
