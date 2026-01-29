import type { HybridObject } from 'react-native-nitro-modules';

export interface WhisperSession extends HybridObject<{ android: 'c++' }> {
	startRecording(): Promise<void>;
	convertNext(durationSeconds: number): Promise<string>;
	convertAvailable(): Promise<string>;
	closeSession(): Promise<void>;
}

export interface SessionOptions {
	modelPath: string;
	locale: string;
	prompt: string;
	shortAudioContext: boolean;
}

export interface WhisperVoiceTyping extends HybridObject<{ android: 'c++' }> {
	openSession(options: SessionOptions): Promise<WhisperSession>;
	test(): Promise<void>;
}
