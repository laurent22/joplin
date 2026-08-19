export interface OnFileEvent {
	uri: string;
	fileName: string;
	type: string|undefined;
}

export type OnFileSavedCallback = (event: OnFileEvent)=> void;

export enum RecorderState {
	Loading = 1,
	Recording = 2,
	Processing = 3,
	Error = 4,
	Downloading = 5,
	Idle = 6,
}
