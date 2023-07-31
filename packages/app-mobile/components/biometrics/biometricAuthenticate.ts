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

		let errorMessage = error.message;
		if (errorName === 'FingerprintScannerNotEnrolled' || errorName === 'FingerprintScannerNotAvailable') {
			errorMessage = _('Biometric unlock is not setup on the device. Please set it up in order to unlock Joplin. If the device is on lockout, consider switching it off and on to reset biometrics scanning.');
		}

		error.message = _('Could not verify your identify: %s', errorMessage);

		logger.warn(error);

		throw error;
	} finally {
		FingerprintScanner.release();
	}
};
