import Logger from '@joplin/lib/Logger';
import Setting from '@joplin/lib/models/Setting';
import FingerprintScanner from 'react-native-fingerprint-scanner';
const logger = Logger.create('sensorInfo');

export interface SensorInfo {
	enabled: boolean;
	sensorsHaveChanged: boolean;
	supportedSensors: string;
}

export default async (): Promise<SensorInfo> => {
	// Early exit if the feature is disabled, so that we don't make any
	// FingerprintScanner scanner calls, since it seems they can fail and freeze
	// the app.

	logger.info('Start');
	logger.info('security.biometricsEnabled', Setting.value('security.biometricsEnabled'));

	if (!Setting.value('security.biometricsEnabled')) {
		return {
			enabled: false,
			sensorsHaveChanged: false,
			supportedSensors: '',
		};
	}

	let hasChanged = false;
	let supportedSensors = '';

	try {
		logger.info('Getting isSensorAvailable...');

		// Note: If `isSensorAvailable()` doesn't return anything, it seems we
		// could assume that biometrics are not setup on the device, and thus we
		// can unlock the app. However that's not always correct - on some
		// devices (eg Galaxy S22), `isSensorAvailable()` will return nothing if
		// the device is on lockout - i.e. if the user gave the wrong
		// fingerprint multiple times.
		//
		// So we definitely can't unlock the app in that case, and it means
		// `isSensorAvailable()` is pretty much useless. Instead we ask for
		// fingerprint when the user turns on the feature and at that point we
		// know if the device supports biometrics or not.
		const result = await FingerprintScanner.isSensorAvailable();
		logger.info('isSensorAvailable result', result);
		supportedSensors = result;

		if (result) {
			if (result !== Setting.value('security.biometricsSupportedSensors')) {
				hasChanged = true;
				Setting.setValue('security.biometricsSupportedSensors', result);
			}
		}
	} catch (error) {
		logger.warn('Could not check for biometrics sensor:', error);
		Setting.setValue('security.biometricsSupportedSensors', '');
	}

	return {
		enabled: Setting.value('security.biometricsEnabled'),
		sensorsHaveChanged: hasChanged,
		supportedSensors,
	};
};
