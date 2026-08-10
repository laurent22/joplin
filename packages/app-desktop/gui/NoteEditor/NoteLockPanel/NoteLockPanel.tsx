import * as React from 'react';
import { useCallback, useState } from 'react';
import { Dispatch } from 'redux';
import { _ } from '@joplin/lib/locale';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
import Button, { ButtonLevel } from '../../Button/Button';
import LabelledPasswordInput from '../../PasswordInput/LabelledPasswordInput';

interface Props {
	noteTitle: string;
	hasNoteLockKey: boolean;
	dispatch: Dispatch;
	undecryptable?: boolean;
}

export default function NoteLockPanel(props: Props) {
	const [password, setPassword] = useState('');
	const [unlocking, setUnlocking] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const onPasswordChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setPassword(event.target.value);
	}, []);

	const unlock = useCallback(async () => {
		if (!password || unlocking) return;
		setUnlocking(true);
		try {
			await NoteLockSession.instance().unlock(password);
			// No success handling: the unlock event swaps this panel out for the note.
		} catch (error) {
			// WebCrypto reports a wrong password as a generic OperationError.
			setErrorMessage(error.name === 'OperationError' ? _('Invalid password') : error.message);
			setUnlocking(false);
		}
	}, [password, unlocking]);

	const onSubmit = useCallback((event: React.FormEvent) => {
		event.preventDefault();
		void unlock();
	}, [unlock]);

	const onSetUpClick = useCallback(() => {
		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Config',
			props: { defaultSection: 'noteLock' },
		});
	}, [props.dispatch]);

	const renderAction = () => {
		if (props.undecryptable) {
			return <p className="message">{_('This note could not be decrypted. If it was encrypted prior to a password reset, the contents are no longer recoverable.')}</p>;
		}

		if (!props.hasNoteLockKey) {
			return (
				<>
					<p className="message">{_('Reading this note requires the note lock password, which has not been set up on this device yet.')}</p>
					<Button level={ButtonLevel.Primary} title={_('Set up note lock')} onClick={onSetUpClick} />
				</>
			);
		}

		return (
			<form className="form unlock-form" onSubmit={onSubmit}>
				<p className="message">{_('This note is encrypted. Enter the note lock password to unlock encrypted notes for this session.')}</p>
				<div className="field">
					<LabelledPasswordInput
						labelText={_('Note lock password')}
						value={password}
						onChange={onPasswordChange}
					/>
				</div>
				{!!errorMessage && <p className="error" role="alert">{errorMessage}</p>}
				<Button type='button' level={ButtonLevel.Primary} title={_('Unlock')} disabled={!password || unlocking} onClick={unlock} />
			</form>
		);
	};

	return (
		<div className="note-lock-panel">
			<i className="icon fas fa-lock" role="img" aria-label={_('Locked note')}></i>
			<h2 className="title">{props.noteTitle}</h2>
			{renderAction()}
		</div>
	);
}
