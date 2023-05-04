import Logger from '@joplin/lib/Logger';
import Vosk from '@joplin/react-native-vosk';
const logger = Logger.create('voiceTyping/vosk');

enum State {
	Idle = 0,
	Recording,
}

let vosk_: Vosk|null = null;
let state_: State = State.Idle;

export interface Recorder {
	stop: ()=> Promise<string>;
}

export const getVosk = async () => {
	if (vosk_) return vosk_;
	vosk_ = new Vosk();
	await vosk_.loadModel('model-fr-fr');
	return vosk_;
};

export const startRecording = (vosk: Vosk): Recorder => {
	if (state_ !== State.Idle) throw new Error('Vosk is already recording');

	state_ = State.Recording;

	const result: string[] = [];
	const eventHandlers: any[] = [];
	let finalResultPromiseResolve: Function = null;
	let finalResultTimeout = false;

	const completeRecording = (finalResult: string) => {
		for (const eventHandler of eventHandlers) {
			eventHandler.remove();
		}

		vosk.cleanup(),

		state_ = State.Idle;

		finalResultPromiseResolve(finalResult);
	};

	eventHandlers.push(vosk.onResult(e => {
		logger.info('Result', e.data);
		result.push(e.data);
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

		completeRecording(e.data);
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
				completeRecording('');
			}, 5000);

			return new Promise((resolve: Function) => {
				finalResultPromiseResolve = resolve;
			});
		},
	};
};
