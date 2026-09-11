import * as React from 'react';
import { Dispatch } from 'redux';
import { useCallback, useState } from 'react';
import { _, _n } from '@joplin/lib/locale';
import DialogButtonRow, { ClickEvent } from '../DialogButtonRow';
import Dialog from '@joplin/lib/components/Dialog';
import DialogTitle from '../DialogTitle';
import LabelledPasswordInput from '../PasswordInput/LabelledPasswordInput';
import { finishNoteLockKeyMigration, migrateLockedNotes } from '@joplin/lib/services/noteLock/NoteLockKeyMigration';
import bridge from '../../services/bridge';

interface Props {
	themeId: number;
	dispatch: Dispatch;
}

export default function(props: Props) {
	const [localPassword, setLocalPassword] = useState('');
	const [targetPassword, setTargetPassword] = useState('');
	const [migrating, setMigrating] = useState(false);
	const [failedCount, setFailedCount] = useState(0);
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
			await finishNoteLockKeyMigration(true);
			onClose();
			return;
		}

		if (event.buttonName === 'ok') {
			setMigrating(true);
			setErrorMessage('');
			let remaining = 0;
			try {
				const result = await migrateLockedNotes(localPassword, targetPassword);
				remaining = result.failed || await finishNoteLockKeyMigration();
			} catch (error) {
				setErrorMessage(error.name === 'OperationError' ? _('Invalid password') : error.message);
				setMigrating(false);
				return;
			}
			setMigrating(false);
			setFailedCount(remaining);
			if (!remaining) onClose();
		}
	}, [localPassword, targetPassword, onClose]);

	return (
		<Dialog onCancel={migrating ? undefined : onClose} className="note-lock-migration-dialog">
			<div className="dialog-root">
				<DialogTitle title={_('Migrate locked notes')}/>
				<div className="dialog-content">
					<p>{_('The sync target uses a different note lock password. Your locked notes must be re-encrypted with that password before synchronisation can continue.')}</p>
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
					{!!failedCount && <p className="error-message" role="alert">{_n('%d locked note could not be migrated. Please try again, or skip it to continue without it.', '%d locked notes could not be migrated. Please try again, or skip them to continue without them.', failedCount, failedCount)}</p>}
					{!!errorMessage && <p className="error-message" role="alert">{errorMessage}</p>}
				</div>
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					okButtonLabel={failedCount ? _('Retry') : _('Migrate')}
					okButtonDisabled={!localPassword || !targetPassword || migrating}
					cancelButtonDisabled={migrating}
					customButtons={[{ name: 'skip', label: _('Skip'), disabled: migrating }]}
				/>
			</div>
		</Dialog>
	);
}
