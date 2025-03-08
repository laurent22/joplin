import { languageCodeOnly } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import Setting from '@joplin/lib/models/Setting';
import { rtrimSlashes } from '@joplin/lib/path-utils';
import shim from '@joplin/lib/shim';
import Vosk from 'react-native-vosk';
import RNFetchBlob from 'rn-fetch-blob';
import { VoiceTypingProvider, VoiceTypingSession } from './VoiceTyping';
import { join } from 'path';

const logger = Logger.create('voiceTyping/vosk');

enum State {
	Idle = 0,
	Recording,
	Completing,
}

interface StartOptions {
	onResult: (text: string)=> void;
}

let vosk_: Record<string, Vosk> = {};

let state_: State = State.Idle;

const defaultSupportedLanguages = {
	'en': 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip',
	'zh': 'https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip',
	'ru': 'https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip',
	'fr': 'https://alphacephei.com/vosk/models/vosk-model-small-fr-0.22.zip',
	'de': 'https://alphacephei.com/vosk/models/vosk-model-small-de-0.15.zip',
	'es': 'https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip',
	'pt': 'https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip',
	'tr': 'https://alphacephei.com/vosk/models/vosk-model-small-tr-0.3.zip',
	'vn': 'https://alphacephei.com/vosk/models/vosk-model-small-vn-0.4.zip',
	'it': 'https://alphacephei.com/vosk/models/vosk-model-small-it-0.22.zip',
	'nl': 'https://alphacephei.com/vosk/models/vosk-model-small-nl-0.22.zip',
	'uk': 'https://alphacephei.com/vosk/models/vosk-model-small-uk-v3-small.zip',
	'ja': 'https://alphacephei.com/vosk/models/vosk-model-small-ja-0.22.zip',
	'hi': 'https://alphacephei.com/vosk/models/vosk-model-small-hi-0.22.zip',
	'cs': 'https://alphacephei.com/vosk/models/vosk-model-small-cs-0.4-rhasspy.zip',
	'pl': 'https://alphacephei.com/vosk/models/vosk-model-small-pl-0.22.zip',
	'uz': 'https://alphacephei.com/vosk/models/vosk-model-small-uz-0.22.zip',
	'ko': 'https://alphacephei.com/vosk/models/vosk-model-small-ko-0.22.zip',
};

export const isSupportedLanguage = (locale: string) => {
	const l = languageCodeOnly(locale).toLowerCase();
	return Object.keys(defaultSupportedLanguages).includes(l);
};

// Where all the models files for all the languages are
const getModelRootDir = () => {
	return `${RNFetchBlob.fs.dirs.DocumentDir}/vosk-models`;
};

// Where we unzip a model after downloading it
const getUnzipDir = (locale: string) => {
	return `${getModelRootDir()}/${locale}`;
};

// Where the model for a particular language is
const getModelDir = (locale: string) => {
	return `${getUnzipDir(locale)}/model`;
};

const languageModelUrl = (locale: string): string => {
	const lang = languageCodeOnly(locale).toLowerCase();
	if (!(lang in defaultSupportedLanguages)) throw new Error(`No language file for: ${locale}`);

	const urlTemplate = rtrimSlashes(Setting.value('voiceTypingBaseUrl').trim());

	if (urlTemplate) {
		let url = rtrimSlashes(urlTemplate);
		if (!url.includes('{lang}')) url += '/{lang}.zip';
		return url.replace(/\{lang\}/g, lang);
	} else {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		return (defaultSupportedLanguages as any)[lang];
	}
};


export const getVosk = async (modelDir: string, locale: string) => {
	if (vosk_[locale]) return vosk_[locale];

	const vosk = new Vosk();
	logger.info(`Loading model from ${modelDir}`);
	await shim.fsDriver().readDirStats(modelDir);
	const result = await vosk.loadModel(modelDir);
	logger.info('getVosk:', result);

	vosk_ = { [locale]: vosk };

	return vosk;
};

export const startRecording = (vosk: Vosk, options: StartOptions): VoiceTypingSession => {
	if (state_ !== State.Idle) throw new Error('Vosk is already recording');

	state_ = State.Recording;

	const result: string[] = [];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const eventHandlers: any[] = [];
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	const finalResultPromiseResolve: Function = null;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	const finalResultPromiseReject: Function = null;
	const finalResultTimeout = false;

	const completeRecording = (finalResult: string, error: Error) => {
		logger.info(`Complete recording. Final result: ${finalResult}. Error:`, error);

		for (const eventHandler of eventHandlers) {
			eventHandler.remove();
		}

		vosk.cleanup();

		state_ = State.Idle;

		if (error) {
			if (finalResultPromiseReject) finalResultPromiseReject(error);
		} else {
			if (finalResultPromiseResolve) finalResultPromiseResolve(finalResult);
		}
	};

	eventHandlers.push(vosk.onResult(e => {
		const text = e.data;
		logger.info('Result', text);
		result.push(text);
		options.onResult(text);
	}));

	eventHandlers.push(vosk.onError(e => {
		logger.warn('Error', e.data);
	}));

	eventHandlers.push(vosk.onTimeout(e => {
		logger.warn('Timeout', e.data);
	}));

	eventHandlers.push(vosk.onFinalResult(e => {
		logger.info('Final result', e.data);

		if (finalResultTimeout) {
			logger.warn('Got final result - but already timed out. Not doing anything.');
			return;
		}

		completeRecording(e.data, null);
	}));


	return {
		start: async () => {
			logger.info('Starting recording...');
			await vosk.start();
		},
		stop: async () => {
			if (state_ === State.Recording) {
				logger.info('Cancelling...');
				state_ = State.Completing;
				vosk.stopOnly();
				completeRecording('', null);
			}
		},
	};
};


const vosk: VoiceTypingProvider = {
	supported: () => true,
	modelLocalFilepath: (locale: string) => getModelDir(locale),
	deleteCachedModels: async (locale: string) => {
		const path = getModelDir(locale);
		await shim.fsDriver().remove(path, { recursive: true });
	},
	getDownloadUrl: (locale) => languageModelUrl(locale),
	getUuidPath: (locale: string) => join(getModelDir(locale), 'uuid'),
	build: async ({ callbacks, locale, modelPath }) => {
		const vosk = await getVosk(modelPath, locale);
		return startRecording(vosk, { onResult: callbacks.onFinalize });
	},
	modelName: 'vosk',
};

export default vosk;
