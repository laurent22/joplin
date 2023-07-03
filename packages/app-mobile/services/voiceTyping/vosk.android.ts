import { languageCodeOnly } from '@joplin/lib/locale';
import Logger from '@joplin/lib/Logger';
import Setting from '@joplin/lib/models/Setting';
import { rtrimSlashes } from '@joplin/lib/path-utils';
import shim from '@joplin/lib/shim';
import Vosk from 'react-native-vosk';
import { unzip } from 'react-native-zip-archive';
import RNFetchBlob from 'rn-fetch-blob';
const md5 = require('md5');

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

export const voskEnabled = true;

export { Vosk };

export interface Recorder {
	stop: ()=> Promise<string>;
	cleanup: ()=> void;
}

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

const languageModelUrl = (locale: string) => {
	const lang = languageCodeOnly(locale).toLowerCase();
	if (!(lang in defaultSupportedLanguages)) throw new Error(`No language file for: ${locale}`);

	const urlTemplate = rtrimSlashes(Setting.value('voiceTypingBaseUrl').trim());

	if (urlTemplate) {
		let url = rtrimSlashes(urlTemplate);
		if (!url.includes('{lang}')) url += '/{lang}.zip';
		return url.replace(/\{lang\}/g, lang);
	} else {
		return (defaultSupportedLanguages as any)[lang];
	}
};

export const modelIsDownloaded = async (locale: string) => {
	const uuidFile = `${getModelDir(locale)}/uuid`;
	return shim.fsDriver().exists(uuidFile);
};

export const getVosk = async (locale: string) => {
	if (vosk_[locale]) return vosk_[locale];

	const vosk = new Vosk();
	const modelDir = await downloadModel(locale);
	logger.info(`Loading model from ${modelDir}`);
	await shim.fsDriver().readDirStats(modelDir);
	const result = await vosk.loadModel(modelDir);
	logger.info('getVosk:', result);

	vosk_ = { [locale]: vosk };

	return vosk;
};

const downloadModel = async (locale: string) => {
	const modelUrl = languageModelUrl(locale);
	const unzipDir = getUnzipDir(locale);
	const zipFilePath = `${unzipDir}.zip`;
	const modelDir = getModelDir(locale);
	const uuidFile = `${modelDir}/uuid`;

	if (await modelIsDownloaded(locale)) {
		logger.info(`Model for ${locale} already exists at ${modelDir}`);
		return modelDir;
	}

	await shim.fsDriver().remove(unzipDir);

	logger.info(`Downloading model from: ${modelUrl}`);

	const response = await shim.fetchBlob(modelUrl, {
		path: zipFilePath,
	});

	if (!response.ok || response.status >= 400) throw new Error(`Could not download from ${modelUrl}: Error ${response.status}`);

	logger.info(`Unzipping ${zipFilePath} => ${unzipDir}`);

	await unzip(zipFilePath, unzipDir);

	const dirs = await shim.fsDriver().readDirStats(unzipDir);
	if (dirs.length !== 1) {
		logger.error('Expected 1 directory but got', dirs);
		throw new Error(`Expected 1 directory, but got ${dirs.length}`);
	}

	const fullUnzipPath = `${unzipDir}/${dirs[0].path}`;

	logger.info(`Moving ${fullUnzipPath} =>  ${modelDir}`);
	await shim.fsDriver().rename(fullUnzipPath, modelDir);

	await shim.fsDriver().writeFile(uuidFile, md5(modelUrl));

	await shim.fsDriver().remove(zipFilePath);

	return modelDir;
};

export const startRecording = (vosk: Vosk, options: StartOptions): Recorder => {
	if (state_ !== State.Idle) throw new Error('Vosk is already recording');

	state_ = State.Recording;

	const result: string[] = [];
	const eventHandlers: any[] = [];
	let finalResultPromiseResolve: Function = null;
	let finalResultPromiseReject: Function = null;
	let finalResultTimeout = false;

	const completeRecording = (finalResult: string, error: Error) => {
		logger.info(`Complete recording. Final result: ${finalResult}. Error:`, error);

		for (const eventHandler of eventHandlers) {
			eventHandler.remove();
		}

		vosk.cleanup(),

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

	logger.info('Starting recording...');

	void vosk.start();

	return {
		stop: (): Promise<string> => {
			logger.info('Stopping recording...');

			vosk.stopOnly();

			logger.info('Waiting for final result...');

			setTimeout(() => {
				finalResultTimeout = true;
				logger.warn('Timed out waiting for finalResult event');
				completeRecording('', new Error('Could not process your message. Please try again.'));
			}, 5000);

			return new Promise((resolve: Function, reject: Function) => {
				finalResultPromiseResolve = resolve;
				finalResultPromiseReject = reject;
			});
		},
		cleanup: () => {
			if (state_ === State.Recording) {
				logger.info('Cancelling...');
				state_ = State.Completing;
				vosk.stopOnly();
				completeRecording('', null);
			}
		},
	};
};
