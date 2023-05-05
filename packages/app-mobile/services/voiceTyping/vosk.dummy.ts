type Vosk = any;

export { Vosk };

export interface Recorder {
	stop: ()=> Promise<string>;
	cleanup: ()=> void;
}

export const getVosk = async () => {
	return {} as any;
};

export const startRecording = (_vosk: Vosk): Recorder => {
	return {
		stop: async () => { return ''; },
		cleanup: () => {},
	};
};

export const voskEnabled = false;
