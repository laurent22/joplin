import { VoiceTypingProvider } from './VoiceTyping';

const vosk: VoiceTypingProvider = {
	supported: () => false,
	modelLocalFilepath: () => null,
	getDownloadUrl: () => null,
	getUuidPath: () => null,
	deleteCachedModels: () => null,
	build: async () => {
		throw new Error('Unsupported!');
	},
	modelName: 'vosk',
};

export default vosk;
