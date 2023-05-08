import {
	EmitterSubscription,
	EventSubscription,
	NativeEventEmitter,
	NativeModules,
	PermissionsAndroid,
	Platform,
} from 'react-native';

const LINKING_ERROR =
	`The package 'react-native-vosk' doesn't seem to be linked. Make sure: \n\n${
		Platform.select({ ios: '- You have run \'pod install\'\n', default: '' })
	}- You rebuilt the app after installing the package\n` +
	'- You are not using Expo managed workflow\n';

const VoskModule = NativeModules.Vosk
	? NativeModules.Vosk
	: new Proxy(
		{},
		{
			get() {
				throw new Error(LINKING_ERROR);
			},
		}
	);

type VoskEvent = {
	/**
	 * Event datas
	 */
	data: string;
};

const eventEmitter = new NativeEventEmitter(VoskModule);

export default class Vosk {
	// Public functions
	public loadModel = (path: string) => VoskModule.loadModel(path);

	private currentRegisteredEvents: EmitterSubscription[] = [];

	public start = (grammar: string[] | null = null): Promise<String> => {

		return new Promise<String>((resolve, reject) => {
			// Check for permission
			this.requestRecordPermission()
				// eslint-disable-next-line promise/prefer-await-to-then
				.then((granted) => {
					if (!granted) return reject('Audio record permission denied');

					// Setup events
					this.currentRegisteredEvents.push(eventEmitter.addListener('onResult', (e: VoskEvent) => resolve(e.data)));
					this.currentRegisteredEvents.push(eventEmitter.addListener('onFinalResult', (e: VoskEvent) => resolve(e.data)));
					this.currentRegisteredEvents.push(eventEmitter.addListener('onError', (e: VoskEvent) => reject(e.data)));
					this.currentRegisteredEvents.push(eventEmitter.addListener('onTimeout', () => reject('timeout')));

					// Start recognition
					VoskModule.start(grammar);
				})
				// eslint-disable-next-line promise/prefer-await-to-then
				.catch((e) => {
					reject(e);
				});
		// eslint-disable-next-line promise/prefer-await-to-then
		}).finally(() => {
			this.cleanListeners();
		});
	};

	public stop = () => {
		this.cleanListeners();
		VoskModule.stop();
	};

	public stopOnly = () => {
		VoskModule.stopOnly();
	};

	public cleanup = () => {
		this.cleanListeners();
		VoskModule.cleanup();
	};

	public unload = () => {
		this.cleanListeners();
		VoskModule.unload();
	};

	// Event listeners builders
	public onResult = (onResult: (e: VoskEvent)=> void): EventSubscription => {
		return eventEmitter.addListener('onResult', onResult);
	};
	public onFinalResult = (onFinalResult: (e: VoskEvent)=> void): EventSubscription => {
		return eventEmitter.addListener('onFinalResult', onFinalResult);
	};
	public onError = (onError: (e: VoskEvent)=> void): EventSubscription => {
		return eventEmitter.addListener('onError', onError);
	};
	public onTimeout = (onTimeout: (e: VoskEvent)=> void): EventSubscription => {
		return eventEmitter.addListener('onTimeout', onTimeout);
	};

	// Private functions
	private requestRecordPermission = async () => {
		if (Platform.OS === 'ios') return true;
		const granted = await PermissionsAndroid.request(
			PermissionsAndroid.PERMISSIONS.RECORD_AUDIO!
		);
		return granted === PermissionsAndroid.RESULTS.GRANTED;
	};

	private cleanListeners = () => {
		// Clean event listeners
		this.currentRegisteredEvents.forEach(subscription => subscription.remove());
		this.currentRegisteredEvents = [];
	};
}
