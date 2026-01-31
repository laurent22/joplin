import type { HybridObject } from 'react-native-nitro-modules';

export interface AudioRecorder extends HybridObject<{ android: 'kotlin' }> {
	start(): void;
	stop(): void;
	waitForData(seconds: number): Promise<void>;
	pullAvailable(): ArrayBuffer;
}

export interface WhisperSession extends HybridObject<{ android: 'c++' }> {
	pushAudio(audio: ArrayBuffer): void;
	convertNext(): Promise<string>;
}

export interface SessionOptions {
	modelPath: string;
	locale: string;
	prompt: string;
	shortAudioContext: boolean;
}

export interface WhisperVoiceTyping extends HybridObject<{ android: 'c++' }> {
	openSession(options: SessionOptions): WhisperSession;
	test(): Promise<void>;
}
