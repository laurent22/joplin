import Logger from '@joplin/utils/Logger';
import Setting from '@joplin/lib/models/Setting';
import { AuthenticationType, hasHardwareAsync, supportedAuthenticationTypesAsync } from 'expo-local-authentication';
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
		//
		// 2025-07-10: isSensorAvailable has been replaced with hasHardwareAsync,
		// which may be more reliable. However, hasHardwareAsync may return false
		// if the user has locked the app with a PIN (rather than biometrics). Test
		// carefully when changing this behavior:
		const hasSensor = await hasHardwareAsync();
		supportedSensors = (await supportedAuthenticationTypesAsync()).map(sensor => {
			if (sensor === AuthenticationType.FINGERPRINT) {
				return 'Touch ID';
			} else if (sensor === AuthenticationType.FACIAL_RECOGNITION) {
				return 'Face ID';
			} else if (sensor === AuthenticationType.IRIS) {
				return 'Iris';
			} else {
				return 'Other';
			}
		}).join(',');

		logger.info('isSensorAvailable result', hasSensor, supportedSensors);

		if (hasSensor) {
			if (supportedSensors !== Setting.value('security.biometricsSupportedSensors')) {
				hasChanged = true;
				Setting.setValue('security.biometricsSupportedSensors', supportedSensors);
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
