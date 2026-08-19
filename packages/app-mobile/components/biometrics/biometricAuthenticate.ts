import Logger from '@joplin/utils/Logger';
import { _ } from '@joplin/lib/locale';
import { authenticateAsync } from 'expo-local-authentication';

const logger = Logger.create('biometricAuthenticate');

export default async () => {
	logger.info('Authenticate...');
	const result = await authenticateAsync({ promptMessage: _('Verify your identity') });

	if (result.success === false) {
		const errorName = result.error;
		if (errorName === 'not_enrolled' || errorName === 'not_available') {
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
		throw new Error(_('Could not verify your identity: %s', errorName));
	}

	logger.info('Authenticate done');
};
