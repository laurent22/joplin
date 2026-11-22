import { _ } from '@joplin/lib/locale';
import * as React from 'react';
import { useRef, useState } from 'react';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import ShareService, { PublicKeyStatus, UserPublicKeyResponse } from '@joplin/lib/services/share/ShareService';
import { msleep } from '@joplin/utils/time';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('PpkWarningIcon');

type OnGetPublicKey = (email: string)=> Promise<UserPublicKeyResponse>;

interface Props {
	recipientEmail: string;
	onShowPpkValidationDialog: ()=> void;
	onGetPublicKey: OnGetPublicKey;
	// Changing this re-checks the key status (e.g. after the user confirms a key)
	refreshCounter: number;
}

const PpkWarningIcon: React.FC<Props> = props => {
	const status = usePpkStatus({ email: props.recipientEmail, onGetPublicKey: props.onGetPublicKey, refreshCounter: props.refreshCounter });

	let icon = { name: 'fas fa-question-circle', label: _('Verify public key') };
	if (status === PublicKeyStatus.Confirmed) {
		icon = { name: 'fas fa-check', label: _('Fingerprint confirmed') };
	} else if (status === PublicKeyStatus.Seen) {
		icon = { name: '', label: _('Same key as last share') };
	} else if (status === PublicKeyStatus.Changed) {
		icon = { name: 'fas fa-exclamation-triangle', label: _('Key changed. Click to re-verify') };
	}

	const buttonTitle = icon.label;
	const iconComponent = <span className='ppk-warning-icon'>
		<i className='fas fa-key' role='img' aria-label={buttonTitle}/>
		{!!icon.name && <sub className='overlay'><i className={icon.name} aria-hidden={true}/></sub>}
	</span>;

	const hasEmail = props.recipientEmail.includes('@');
	return <button
		disabled={!hasEmail}
		onClick={props.onShowPpkValidationDialog}
		className='link-button'
		title={buttonTitle}
	>{iconComponent}</button>;
};

export default PpkWarningIcon;

// Only fetches the key when there's an earlier key to compare against, to avoid a server request for every typed email.
const getPpkStatus = async (email: string, loadPublicKey: OnGetPublicKey) => {
	if (!await ShareService.instance().hasPreviousPublicKey(email)) {
		return PublicKeyStatus.Unknown;
	}
	return ShareService.instance().publicKeyStatus(email, await loadPublicKey(email));
};

interface UsePpkStatusProps {
	email: string;
	onGetPublicKey: OnGetPublicKey;
	refreshCounter: number;
}

const usePpkStatus = (props: UsePpkStatusProps) => {
	const [status, setStatus] = useState(PublicKeyStatus.Unknown);

	const propsRef = useRef(props);
	propsRef.current = props;
	const email = props.email;

	useAsyncEffect(async (event) => {
		setStatus(PublicKeyStatus.Unknown);
		try {
			const debounceEffect = () => msleep(100);
			await debounceEffect();
			if (event.cancelled) return;

			const newStatus = await getPpkStatus(email, propsRef.current.onGetPublicKey);
			if (event.cancelled) return;

			setStatus(newStatus);
		} catch (error) {
			logger.warn('Failed to update ppk icon', error);
			if (!event.cancelled) {
				setStatus(PublicKeyStatus.Unknown);
			}
		}
	}, [email, props.refreshCounter]);

	return status;
};
