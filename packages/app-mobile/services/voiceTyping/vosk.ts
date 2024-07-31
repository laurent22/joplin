// Currently disabled on non-Android platforms

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type Vosk = any;

export { Vosk };

interface StartOptions {
	onResult: (text: string)=> void;
}

export interface Recorder {
	stop: ()=> Promise<string>;
	cleanup: ()=> void;
}

export const isSupportedLanguage = (_locale: string) => {
	return false;
};

export const modelIsDownloaded = async (_locale: string) => {
	return false;
};

export const getVosk = async (_locale: string) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return {} as any;
};

export const startRecording = (_vosk: Vosk, _options: StartOptions): Recorder => {
	return {
		stop: async () => { return ''; },
		cleanup: () => {},
	};
};

export const voskEnabled = false;
