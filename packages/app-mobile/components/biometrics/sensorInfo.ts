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
