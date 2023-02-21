import Setting from '@joplin/lib/models/Setting';
import FingerprintScanner from 'react-native-fingerprint-scanner';

export interface SensorInfo {
	enabled: boolean;
	sensorsHaveChanged: boolean;
	supportedSensors: string;
}

export default async (): Promise<SensorInfo> => {
	let hasChanged = false;
	let supportedSensors = '';

	try {
		const result = await FingerprintScanner.isSensorAvailable();
		supportedSensors = result;

		if (result) {
			if (result !== Setting.value('security.biometricsSupportedSensors')) {
				hasChanged = true;
				Setting.setValue('security.biometricsSupportedSensors', result);
			}
		}
	} catch (error) {
		console.warn('Could not check for biometrics sensor:', error);
		Setting.setValue('security.biometricsSupportedSensors', '');
	}

	return {
		enabled: Setting.value('security.biometricsEnabled'),
		sensorsHaveChanged: hasChanged,
		supportedSensors,
	};
};
