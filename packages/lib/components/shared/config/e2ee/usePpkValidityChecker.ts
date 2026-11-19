import Logger from '@joplin/utils/Logger';
import useAsyncEffect from '../../../../hooks/useAsyncEffect';
import { _ } from '../../../../locale';
import EncryptionService from '../../../../services/e2ee/EncryptionService';
import { PublicPrivateKeyPair, isPublicPrivateKeyPairValid } from '../../../../services/e2ee/ppk/ppk';
import { MasterPasswordStatus, regeneratePpk } from '../../../../services/e2ee/utils';
import shim from '../../../../shim';
import type { Dispatch } from 'redux';
import { reg } from '../../../../registry';

const logger = Logger.create('usePpkValidityChecker');

export interface PpkValidityCheckerProps {
	dispatch: Dispatch;
	password: string;
	passwordStatus: MasterPasswordStatus;
	ppk: PublicPrivateKeyPair|undefined;
	invalidPpk: boolean;
}

const usePpkValidityChecker = (props: PpkValidityCheckerProps) => {
	const React = shim.react();
	const { useRef, useState, useCallback } = React;

	const resettingRef = useRef(false);
	const [resetting, setResetting] = useState(false);
	const onResetPpk = useCallback(async () => {
		if (resettingRef.current) return;
		try {
			resettingRef.current = true;
			setResetting(true);

			logger.warn('Regenerating invalid PPK');
			await regeneratePpk(props.ppk);

			props.dispatch({ type: 'MUST_FIX_PPK', value: false });
			void reg.scheduleSync(0);
		} catch (error) {
			logger.warn('Failed to reset PPK', error);
			void shim.showErrorDialog(_('Failed to reset key pair: %s', error.message));
		} finally {
			resettingRef.current = false;
			setResetting(false);
		}
	}, [props.ppk, props.dispatch]);

	const onShowInvalidPpkHelp = () => {
		void shim.openUrl('https://joplinapp.org/help/faq#why-is-my-app-showing-an-invalid-public-private-key-pair-banner');
	};

	const valid = useIsPpkValid(props);
	const passwordCannotDecrypt = props.passwordStatus === MasterPasswordStatus.Invalid;
	const message = valid === false && `❌ ${passwordCannotDecrypt ? _('The master password cannot decrypt the private key. The key pair may have been replaced.') : _('Incorrect public key.')}`;
	return { valid, resetting, onResetPpk, onShowInvalidPpkHelp, message };
};

export default usePpkValidityChecker;

const useIsPpkValid = (props: PpkValidityCheckerProps) => {
	const { useState } = shim.react();
	const [valid, setValid] = useState<boolean|undefined>(undefined);

	useAsyncEffect(async (event) => {
		if (!props.ppk) {
			setValid(undefined);
			return;
		}

		// Checked before the password status: The master password is considered invalid
		// if the PPK private key fails to decrypt. The PPK may still need to be regenerated
		// in this case:
		if (props.invalidPpk) {
			setValid(false);
			return;
		}

		if (props.passwordStatus !== MasterPasswordStatus.Valid) {
			setValid(undefined);
			return;
		}

		try {
			const checkPassed = await isPublicPrivateKeyPairValid(EncryptionService.instance(), props.ppk, props.password);
			if (event.cancelled) return;
			setValid(checkPassed);
		} catch (error) {
			// Can happen if the password goes from valid -> invalid, but props.passwordStatus hasn't updated yet
			logger.warn('Failed to check validity (invalid password?):', error);
			if (!event.cancelled) {
				setValid(undefined);
			}
		}
	}, [props.ppk, props.password, props.passwordStatus, props.invalidPpk]);

	return valid;
};
