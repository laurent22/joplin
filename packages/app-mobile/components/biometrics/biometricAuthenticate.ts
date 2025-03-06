import Logger from '@joplin/utils/Logger';
import FingerprintScanner, { Errors } from 'react-native-fingerprint-scanner';
import { _ } from '@joplin/lib/locale';

const logger = Logger.create('biometricAuthenticate');

export default async () => {
	try {
		logger.info('Authenticate...');
		await FingerprintScanner.authenticate({ description: _('Verify your identity') });
		logger.info('Authenticate done');
	} catch (error) {
		const errorName = (error as Errors).name;

		const errorMessage = error.message;
		if (errorName === 'FingerprintScannerNotEnrolled' || errorName === 'FingerprintScannerNotAvailable') {
			// In that case we skip the check because the device biometric unlock has been disabled
			// by the user. It should be safe to skip the check since in order to disable it, they
			// must have full access to the phone, and should have to enter their pin. Not skipping
			// the check would be a problem if biometric unlock was disabled as a result of being
			// broken. In this case, the user will never be able to unlock Joplin.
			// Ref: https://github.com/laurent22/joplin/issues/10926

			logger.warn('Biometric unlock is not setup on the device - skipping check');
			return;

			// errorMessage = _('Biometric unlock is not setup on the device. Please set it up in order to unlock Joplin. If the device is on lockout, consider switching it off and on to reset biometrics scanning.');
		}

		error.message = _('Could not verify your identity: %s', errorMessage);

		logger.warn(error);

		throw error;
	} finally {
		FingerprintScanner.release();
	}
};
