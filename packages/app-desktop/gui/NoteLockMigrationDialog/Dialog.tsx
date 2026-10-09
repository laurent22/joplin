import * as React from 'react';
import { Dispatch } from 'redux';
import { useCallback, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import DialogButtonRow, { ClickEvent } from '../DialogButtonRow';
import Dialog from '@joplin/lib/components/Dialog';
import DialogTitle from '../DialogTitle';
import LabelledPasswordInput from '../PasswordInput/LabelledPasswordInput';
import { finishNoteLockKeyMigration, startNoteLockKeyMigration } from '@joplin/lib/services/noteLock/NoteLockKeyMigration';
import bridge from '../../services/bridge';

interface Props {
	themeId: number;
	dispatch: Dispatch;
}

export default function(props: Props) {
	const [localPassword, setLocalPassword] = useState('');
	const [targetPassword, setTargetPassword] = useState('');
	const [migrating, setMigrating] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const onClose = useCallback(() => {
		props.dispatch({
			type: 'DIALOG_CLOSE',
			name: 'noteLockMigration',
		});
	}, [props.dispatch]);

	const onLocalPasswordChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setLocalPassword(event.target.value);
	}, []);

	const onTargetPasswordChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setTargetPassword(event.target.value);
	}, []);

	const onButtonRowClick = useCallback(async (event: ClickEvent) => {
		if (event.buttonName === 'cancel') {
			onClose();
			return;
		}

		if (event.buttonName === 'skip') {
			if (!bridge().showConfirmMessageBox(_('Notes still locked with the password of this device will become permanently unreadable. Continue without migrating them?'))) return;
			finishNoteLockKeyMigration();
			props.dispatch({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: null });
			onClose();
			return;
		}

		if (event.buttonName === 'ok') {
			setMigrating(true);
			setErrorMessage('');
			try {
				await startNoteLockKeyMigration(localPassword, targetPassword, props.dispatch, onClose);
			} catch (error) {
				setErrorMessage(error.name === 'OperationError' ? _('Invalid password') : error.message);
				setMigrating(false);
			}
		}
	}, [localPassword, targetPassword, onClose, props.dispatch]);

	return (
		<Dialog onCancel={migrating ? undefined : onClose} className="note-lock-migration-dialog">
			<div className="dialog-root">
				<DialogTitle title={_('Migrate locked notes')}/>
				<div className="dialog-content">
					<p>{_('The sync target uses a different note lock key to the one on your device. Your locked notes must be re-encrypted with the synced key before synchronisation can continue. Locked notes cannot be read while they are being migrated.')}</p>
					<LabelledPasswordInput
						labelText={_('Note lock password on this device')}
						value={localPassword}
						onChange={onLocalPasswordChange}
					/>
					<LabelledPasswordInput
						labelText={_('Note lock password on the sync target')}
						value={targetPassword}
						onChange={onTargetPasswordChange}
					/>
					{!!errorMessage && <p className="error-message" role="alert">{errorMessage}</p>}
				</div>
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					okButtonLabel={_('Migrate')}
					okButtonDisabled={!localPassword || !targetPassword || migrating}
					cancelButtonDisabled={migrating}
					customButtons={[{ name: 'skip', label: _('Skip'), disabled: migrating }]}
				/>
			</div>
		</Dialog>
	);
}
