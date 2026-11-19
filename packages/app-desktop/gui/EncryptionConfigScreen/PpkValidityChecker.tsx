import { _ } from '@joplin/lib/locale';
import { PublicPrivateKeyPair } from '@joplin/lib/services/e2ee/ppk/ppk';
import { MasterPasswordStatus } from '@joplin/lib/services/e2ee/utils';
import * as React from 'react';
import usePpkValidityChecker from '@joplin/lib/components/shared/config/e2ee/usePpkValidityChecker';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../app.reducer';


interface Props {
	password: string;
	passwordStatus: MasterPasswordStatus;
	ppk: PublicPrivateKeyPair;
}

const PpkValidityChecker: React.FC<Props> = props => {
	const invalidPpk = useSelector((state: AppState) => state.mustFixPpk);
	const dispatch = useDispatch();
	const { message, onResetPpk, onShowInvalidPpkHelp, resetting } = usePpkValidityChecker({ ...props, invalidPpk, dispatch });

	const localStateMessageComponent = !!message && (
		<p>
			{message}{' '}
			<button className='link-button' onClick={onShowInvalidPpkHelp}>{_('Help')}</button>
			{' / '}
			<button className='link-button' onClick={onResetPpk} disabled={resetting}>{_('Regenerate key pair')}</button>
		</p>
	);

	return localStateMessageComponent ? <div className='section'>
		<h2>{_('Public-private key pair')}</h2>
		{localStateMessageComponent}
	</div> : null;

};

export default PpkValidityChecker;
