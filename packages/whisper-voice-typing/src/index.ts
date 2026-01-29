import { NitroModules } from 'react-native-nitro-modules';
import type { SessionOptions, WhisperSession, WhisperVoiceTyping } from './specs/Whisper.nitro';

let WhisperVoiceTypingHybridObject: WhisperVoiceTyping|null = null;

export type { SessionOptions, WhisperSession };

const getVoiceTyping = () => {
	WhisperVoiceTypingHybridObject ??= NitroModules.createHybridObject<WhisperVoiceTyping>('WhisperVoiceTyping');
	return WhisperVoiceTypingHybridObject;
};

export function openSession(options: SessionOptions) {
	return getVoiceTyping().openSession(options);
}

export function test() {
	return getVoiceTyping().test();
}
