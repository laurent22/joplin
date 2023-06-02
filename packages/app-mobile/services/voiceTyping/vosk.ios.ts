// Currently disabled on iOS

type Vosk = any;

export { Vosk };

interface StartOptions {
	onResult: (text: string)=> void;
}

export interface Recorder {
	stop: ()=> Promise<string>;
	cleanup: ()=> void;
}

export const getVosk = async () => {
	return {} as any;
};

export const startRecording = (_vosk: Vosk, _options: StartOptions): Recorder => {
	return {
		stop: async () => { return ''; },
		cleanup: () => {},
	};
};

export const voskEnabled = false;
