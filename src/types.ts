// Define your types here, for instance:
export interface Note {
    semitone: number;
    name: string;
    isSharp: boolean;
}

export interface VocalRange {
    start: Note | null;
    end: Note | null;
}