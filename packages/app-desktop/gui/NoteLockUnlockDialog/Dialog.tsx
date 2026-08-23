import * as React from 'react';
import { Dispatch } from 'redux';
import { useCallback, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import DialogButtonRow, { ClickEvent } from '../DialogButtonRow';
import Dialog from '@joplin/lib/components/Dialog';
import DialogTitle from '../DialogTitle';
import CommandService from '@joplin/lib/services/CommandService';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
import LabelledPasswordInput from '../PasswordInput/LabelledPasswordInput';

interface SuccessCommand {
	name: string;
	args: string[];
}

interface Props {
	themeId: number;
	dispatch: Dispatch;
	successCommand?: SuccessCommand;
}

export default function(props: Props) {
	const [password, setPassword] = useState('');
	const [unlocking, setUnlocking] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const onClose = useCallback(() => {
		props.dispatch({
			type: 'DIALOG_CLOSE',
			name: 'noteLockUnlock',
		});
	}, [props.dispatch]);

	const onPasswordChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setPassword(event.target.value);
	}, []);

	const onButtonRowClick = useCallback(async (event: ClickEvent) => {
		if (event.buttonName === 'cancel') {
			onClose();
			return;
		}

		if (event.buttonName === 'ok') {
			setUnlocking(true);
			try {
				await NoteLockSession.instance().unlock(password);
			} catch (error) {
				// WebCrypto reports a wrong password as a generic OperationError.
				setErrorMessage(error.name === 'OperationError' ? _('Invalid password') : error.message);
				setUnlocking(false);
				return;
			}
			setUnlocking(false);
			onClose();
			if (props.successCommand) {
				void CommandService.instance().execute(props.successCommand.name, ...props.successCommand.args);
			}
		}
	}, [password, onClose, props.successCommand]);

	return (
		<Dialog onCancel={onClose} className="note-lock-unlock-dialog">
			<div className="dialog-root">
				<DialogTitle title={_('Unlock notes')}/>
				<div className="dialog-content">
					<p>{_('Enter the note lock password to unlock your notes for this session.')}</p>
					<LabelledPasswordInput
						labelText={_('Note lock password')}
						value={password}
						onChange={onPasswordChange}
					/>
					{!!errorMessage && <p className="error-message" role="alert">{errorMessage}</p>}
				</div>
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					okButtonLabel={_('Unlock')}
					okButtonDisabled={!password || unlocking}
					cancelButtonDisabled={unlocking}
				/>
			</div>
		</Dialog>
	);
}
