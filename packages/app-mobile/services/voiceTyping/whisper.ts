import Setting, { Env } from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { rtrimSlashes } from '@joplin/utils/path';
import { dirname, join } from 'path';
import { NativeModules } from 'react-native';
import { SpeechToTextCallbacks, VoiceTypingProvider, VoiceTypingSession } from './VoiceTyping';
import { languageCodeOnly, stringByLocale } from '@joplin/lib/locale';

const logger = Logger.create('voiceTyping/whisper');

const { SpeechToTextModule } = NativeModules;

class WhisperConfig {
	public prompts: Map<string, string> = new Map();
	public supportsShortAudioCtx = false;
	public stringReplacements: [string, string][] = [];
	public regexReplacements: [RegExp, string][] = [];

	public constructor(json: unknown) {
		const errorPrefix = 'Whisper config';
		if (typeof json !== 'object') throw new Error('Whisper config is not an object');

		const processPrompts = () => {
			if (!('prompts' in json)) return;
			if (typeof json.prompts !== 'object') {
				throw new Error(`${errorPrefix}: Field "prompts" is not an object`);
			}

			for (const [key, value] of Object.entries(json.prompts)) {
				if (typeof value !== 'string') {
					throw new Error(`${errorPrefix}: Value for key ${key} is ${typeof value}, not string.`);
				}
				this.prompts.set(key, value);
			}
		};
		const processOutputSettings = () => {
			if (!('output' in json)) return;
			if (typeof json.output !== 'object') {
				throw new Error(`${errorPrefix}: Field "output" is not an object`);
			}

			const getReplacements = (key: string, value: unknown) => {
				if (!Array.isArray(value)) {
					throw new Error(`${errorPrefix}: ${key} must be an array`);
				}

				const results: [string, string][] = [];
				for (const replacement of value) {
					if (!Array.isArray(replacement)) {
						throw new Error(`${errorPrefix}: values for ${key} must be arrays`);
					}
					if (typeof replacement[0] !== 'string' || typeof replacement[1] !== 'string') {
						throw new Error(`${errorPrefix}: values for ${key} must be pairs of strings`);
					}

					results.push([replacement[0], replacement[1]]);
				}
				return results;
			};

			if ('stringReplacements' in json.output) {
				this.stringReplacements = getReplacements('stringReplacements', json.output.stringReplacements);
			}

			if ('regexReplacements' in json.output) {
				this.regexReplacements = getReplacements('regexReplacements', json.output.regexReplacements).map(([key, value]) => {
					return [new RegExp(key, 'g'), value];
				});
			}
		};

		// Models fine-tuned as per https://github.com/futo-org/whisper-acft should have
		// "shortAudioContext": true in their config.json.
		if ('shortAudioContext' in json) {
			this.supportsShortAudioCtx = !!json.shortAudioContext;
		}

		processPrompts();
		processOutputSettings();
	}
}

class Whisper implements VoiceTypingSession {
	private closeCounter = 0;
	private isFirstParagraph = true;

	public constructor(
		private sessionId: number|null,
		private callbacks: SpeechToTextCallbacks,
		private config: WhisperConfig,
	) {
	}

	private postProcessSpeech(data: string) {
		const paragraphs = data.split('\n\n');

		const result = [];
		for (let paragraph of paragraphs) {
			paragraph = paragraph.trim();

			for (const [key, value] of this.config.stringReplacements) {
				paragraph = paragraph.split(key).join(value);
			}
			for (const [key, value] of this.config.regexReplacements) {
				paragraph = paragraph.replace(key, value);
			}

			if (paragraph) {
				result.push(paragraph);
			}
		}

		return result.join('\n\n');
	}

	private onDataFinalize(data: string) {
		data = this.postProcessSpeech(data);
		if (data.length) {
			const prefix = this.isFirstParagraph ? '' : '\n\n';
			this.callbacks.onFinalize(`${prefix}${data}`);
			this.isFirstParagraph = false;
		}
	}

	public async start() {
		if (this.sessionId === null) {
			throw new Error('Session closed.');
		}
		try {
			logger.debug('starting recorder');
			await SpeechToTextModule.startRecording(this.sessionId);
			logger.debug('recorder started');

			const loopStartCounter = this.closeCounter;
			while (this.closeCounter === loopStartCounter && this.sessionId !== null) {
				logger.debug('reading block');
				const data: string = await SpeechToTextModule.convertNext(this.sessionId, 4);
				this.onDataFinalize(data);

				logger.debug('done reading block. Length', data?.length);
			}
		} catch (error) {
			logger.error('Whisper error:', error);
			await this.cancel();
			throw error;
		}
	}

	public async stop() {
		if (this.sessionId === null) {
			logger.debug('Session already closed.');
			return;
		}

		try {
			const data: string = await SpeechToTextModule.convertAvailable(this.sessionId);
			this.onDataFinalize(data);
		} catch (error) {
			logger.error('Error stopping session: ', error);
		}

		return this.cancel();
	}

	public cancel() {
		if (this.sessionId === null) {
			logger.debug('No session to cancel.');
			return;
		}

		logger.info('Closing session...');
		const sessionId = this.sessionId;
		this.sessionId = null;
		this.closeCounter ++;

		return SpeechToTextModule.closeSession(sessionId);
	}
}

const getGlossaryPrompt = (locale: string) => {
	const glossary = Setting.value('voiceTyping.glossary');
	if (!glossary) return '';

	// Re-define the "_" localization function so that it uses the transcription locale (as opposed to the UI locale).
	const _ = (text: string) => {
		return stringByLocale(locale, text);
	};
	let glossaryPrefix = _('Glossary:');

	// Prefer no prefix if no appropriate translation of "Glossary:" is available:
	if (glossaryPrefix === 'Glossary:' && languageCodeOnly(locale) !== 'en') {
		glossaryPrefix = '';
	}

	return `${glossaryPrefix} ${glossary}`.trim();
};

const getPrompt = (locale: string, localeToPrompt: Map<string, string>) => {
	const basePrompt = localeToPrompt.get(languageCodeOnly(locale));
	return [
		basePrompt,
		getGlossaryPrompt(locale),
	].filter(part => !!part).join(' ');
};

const modelLocalDirectory = () => {
	return `${shim.fsDriver().getAppDirectoryPath()}/voice-typing-models`;
};

const modelLocalFilepath = () => {
	return `${modelLocalDirectory()}/model/`;
};

const whisper: VoiceTypingProvider = {
	supported: () => !!SpeechToTextModule && Setting.value('buildFlag.voiceTypingEnabled'),
	modelLocalFilepath: modelLocalFilepath,
	getDownloadUrl: (locale) => {
		const lang = languageCodeOnly(locale).toLowerCase();
		let urlTemplate = rtrimSlashes(Setting.value('voiceTypingBaseUrl').trim());

		if (!urlTemplate) {
			urlTemplate = 'https://github.com/joplin/voice-typing-models/releases/download/v0.2.0/{task}.zip';
		}

		return urlTemplate
			.replace(/\{task\}/g, 'whisper-small-q8_0')
			.replace(/\{lang\}/g, lang);
	},
	deleteCachedModels: async (locale) => {
		const pathsToRemove = [
			modelLocalFilepath(),
			whisper.getUuidPath(locale),
			// Legacy model filepath
			join(modelLocalDirectory(), 'whisper_tiny.onnx'),
		];

		for (const path of pathsToRemove) {
			if (await shim.fsDriver().exists(path)) {
				logger.info('Remove', path);
				await shim.fsDriver().remove(path, { recursive: true });
			}
		}
	},
	getUuidPath: () => {
		return join(dirname(modelLocalFilepath()), 'uuid');
	},
	build: async ({ modelPath: modelFolderPath, callbacks, locale }) => {
		logger.debug('Creating Whisper session from path', modelFolderPath);
		if (!await shim.fsDriver().exists(modelFolderPath)) throw new Error(`No model found at path: ${JSON.stringify(modelFolderPath)}`);

		if (Setting.value('env') === Env.Dev) {
			try {
				await SpeechToTextModule.runTests();
			} catch (error) {
				logger.error('Testing error', error);
				await shim.showErrorDialog(`Test failure: ${error}`);
			}
		}

		const modelPath = join(modelFolderPath, 'model.bin');
		const configJsonPath = join(modelFolderPath, 'config.json');
		const configJson = JSON.parse(await shim.fsDriver().readFile(configJsonPath, 'utf-8'));
		const config = new WhisperConfig(configJson);

		if (!await shim.fsDriver().exists(modelPath)) {
			throw new Error(`Model not found at path ${modelPath}`);
		}

		logger.debug('Starting whisper session', config.supportsShortAudioCtx ? '(short audio context)' : '');
		const sessionId = await SpeechToTextModule.openSession(
			modelPath, locale, getPrompt(locale, config.prompts), config.supportsShortAudioCtx,
		);
		return new Whisper(sessionId, callbacks, config);
	},
	modelName: 'whisper',
};

export default whisper;
