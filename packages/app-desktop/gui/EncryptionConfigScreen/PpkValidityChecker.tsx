import { _ } from '@joplin/lib/locale';
import { PublicPrivateKeyPair } from '@joplin/lib/services/e2ee/ppk/ppk';
import { MasterPasswordStatus } from '@joplin/lib/services/e2ee/utils';
import * as React from 'react';
import usePpkValidityChecker from '@joplin/lib/components/shared/config/e2ee/usePpkValidityChecker';
import usePublicKeyFingerprint from '@joplin/lib/components/shared/config/e2ee/usePublicKeyFingerprint';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../app.reducer';
import isJoplinServerVariant from '@joplin/lib/models/utils/isJoplinServerVariant';
import CopyableCode from '../CopyableCode';

interface Props {
	password: string;
	passwordStatus: MasterPasswordStatus;
	ppk: PublicPrivateKeyPair;
}

const PpkValidityChecker: React.FC<Props> = props => {
	const invalidPpk = useSelector((state: AppState) => state.mustFixPpk);
	const dispatch = useDispatch();
	const { valid, message, onResetPpk, onShowInvalidPpkHelp, resetting } = usePpkValidityChecker({ ...props, invalidPpk, dispatch });
	const fingerprint = usePublicKeyFingerprint(props.ppk);
	const supportsSharing = useSelector((state: AppState) => isJoplinServerVariant(state.settings['sync.target']));

	const localStateMessageComponent = !!message && (
		<p>
			{message}{' '}
			<button className='link-button' onClick={onShowInvalidPpkHelp}>{_('Help')}</button>
			{' / '}
			<button className='link-button' onClick={onResetPpk} disabled={resetting}>{_('Regenerate key pair')}</button>
		</p>
	);
	const publicKeyFingerprintComponent = !!valid && !!supportsSharing && !!fingerprint && (
		<div>
			<strong>{_('Public key fingerprint:')}</strong>
			<CopyableCode content={fingerprint}/>
		</div>
	);

	return (localStateMessageComponent || publicKeyFingerprintComponent) ? <div className='section'>
		<h2>{_('Public-private key pair')}</h2>
		{localStateMessageComponent}
		{publicKeyFingerprintComponent}
		<p>{_('Public-private key pairs are used when sending and receiving share invitations.')}</p>
	</div> : null;
};

export default PpkValidityChecker;
