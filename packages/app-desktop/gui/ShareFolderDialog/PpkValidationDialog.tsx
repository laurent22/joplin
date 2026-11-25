import * as React from 'react';
import Dialog from '@joplin/lib/components/Dialog';
import { _ } from '@joplin/lib/locale';
import { useCallback, useRef, useState } from 'react';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import ShareService, { PublicKeyStatus, UserPublicKeyResponse } from '@joplin/lib/services/share/ShareService';
import shim from '@joplin/lib/shim';
import DialogButtonRow, { ClickEvent } from '../DialogButtonRow';
import { useSelector } from 'react-redux';
import { AppState } from '../../app.reducer';
import CopyableCode from '../CopyableCode';
import { formatPublicKeyFingerprint, ppkPublicKeyFingerprint, PublicPrivateKeyPair } from '@joplin/lib/services/e2ee/ppk/ppk';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('PpkValidationDialog');

const openShareE2eeHelp = () => {
	void shim.openUrl('https://joplinapp.org/help/apps/share_notebook#what-is-the-end-to-end-encryption-connection-security-check');
};

interface Props {
	recipientEmail: string;
	onGetPublicKey: (email: string)=> Promise<UserPublicKeyResponse>;
	onFingerprintShown: (email: string, publicKey: PublicPrivateKeyPair)=> void;
	onFingerprintConfirmed: (email: string, publicKey: PublicPrivateKeyPair)=> void;
	onDismiss: ()=> void;
}

const PpkValidationDialog: React.FC<Props> = props => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [publicKey, setPublicKey] = useState<PublicPrivateKeyPair|null>(null);
	const [publicKeyFingerprint, setPublicKeyFingerprint] = useState('');
	const [keyStatus, setKeyStatus] = useState(PublicKeyStatus.Unknown);
	const themeId = useSelector((state: AppState) => state.settings.theme);

	const propsRef = useRef(props);
	propsRef.current = props;

	useAsyncEffect(async (event) => {
		setError('');
		setPublicKey(null);
		setPublicKeyFingerprint('');
		setKeyStatus(PublicKeyStatus.Unknown);
		setLoading(true);
		try {
			const publicKey = await propsRef.current.onGetPublicKey(props.recipientEmail);
			if (event.cancelled) return;

			if (!publicKey) {
				setPublicKeyFingerprint('');
				setError(_('No public key. Please ask "%s" to enable encryption in settings > encryption.', props.recipientEmail));
			} else {
				const status = await ShareService.instance().publicKeyStatus(props.recipientEmail, publicKey);
				const hash = await ppkPublicKeyFingerprint(publicKey);
				if (event.cancelled) return;

				setPublicKey(publicKey);
				setPublicKeyFingerprint(formatPublicKeyFingerprint(hash));
				setKeyStatus(status);
				propsRef.current.onFingerprintShown(props.recipientEmail, publicKey);
			}
		} catch (error) {
			logger.warn('Failed to fetch public key', error);
			if (!event.cancelled) {
				setError(_('Failed to fetch public key: %s', String(error)));
			}
		} finally {
			if (!event.cancelled) {
				setLoading(false);
			}
		}
	}, [props.recipientEmail]);

	const onButtonClick = useCallback(async (event: ClickEvent) => {
		if (event.buttonName === 'ok' && publicKey) {
			try {
				await ShareService.instance().markPublicKeyAsConfirmed(props.recipientEmail, publicKey);
				propsRef.current.onFingerprintConfirmed(props.recipientEmail, publicKey);
			} catch (error) {
				logger.warn('Failed to mark public key as confirmed', error);
				setError(_('Failed to save confirmation: %s', String(error)));
				return;
			}
		}
		propsRef.current.onDismiss();
	}, [publicKey, props.recipientEmail]);

	const publicKeyDisplay = !!publicKeyFingerprint && <CopyableCode className='fingerprint' content={publicKeyFingerprint} />;

	const loadingTitle = _('Loading...');

	return <Dialog onCancel={props.onDismiss} contentClassName='ppk-validation-dialog'>
		<h1>{_('Check connection security')}</h1>
		<p>
			{_('For added security, check that this public key fingerprint matches what\'s shown in the recipient\'s app (in settings > encryption):')}
		</p>
		{error ? <p className='callout-box -warning'>{error}</p> : null}
		{loading ? <div className='loading loading-animation' role='img' aria-label={loadingTitle} title={loadingTitle} /> : publicKeyDisplay}
		<p>
			{_('If the fingerprint doesn\'t match what\'s shown in the recipient\'s settings, do not add them as a share recipient.')}{' '}
			{_('Viewing a public key fingerprint requires a recent version of Joplin.')}{' '}
			<button role='link' className='link-button' onClick={openShareE2eeHelp}>{_('Learn more')}</button>
		</p>
		{keyStatus === PublicKeyStatus.Confirmed && <p>
			<strong>{_('Fingerprint confirmed:')}</strong>{' '}
			{_('You confirmed on this device that this fingerprint matches what\'s shown in %s\'s app.', props.recipientEmail)}
		</p>}
		{keyStatus === PublicKeyStatus.Seen && <p>
			<strong>{_('Same key as last share:')}</strong>{' '}
			{_('The public key fingerprint matches the last share invitation sent to "%s" from this device.', props.recipientEmail)}
		</p>}
		{keyStatus === PublicKeyStatus.Changed && <p className='callout-box -warning'>
			<strong>{_('This key has changed:')}</strong>{' '}
			{_('This device remembers a different key for "%s".', props.recipientEmail)}
			<br/><br/>
			{_('This is expected if the recipient recently updated Joplin or regenerated the key pair. Otherwise, someone else may be trying to receive the invitation.')}{' '}
			{_('Check the fingerprint before sharing.')}
		</p>}
		<DialogButtonRow
			themeId={themeId}
			cancelButtonLabel={_('Done')}
			okButtonShow={!!publicKey && keyStatus !== PublicKeyStatus.Confirmed}
			okButtonLabel={_('Fingerprints match')}
			onClick={onButtonClick}
		/>
	</Dialog>;
};

export default PpkValidationDialog;
