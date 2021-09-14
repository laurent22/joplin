import * as React from 'react';
import { useCallback, useState, useEffect } from 'react';
import { _ } from '@joplin/lib/locale';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import DialogButtonRow, { ClickEvent } from '../DialogButtonRow';
import Dialog from '../Dialog';
import DialogTitle from '../DialogTitle';
import StyledInput from '../style/StyledInput';
import { getMasterPasswordStatus, getMasterPasswordStatusMessage, masterPasswordIsValid, MasterPasswordStatus, updateMasterPassword } from '@joplin/lib/services/e2ee/utils';
import { reg } from '@joplin/lib/registry';

interface Props {
	themeId: number;
	dispatch: Function;
}

export default function(props: Props) {
	const [status, setStatus] = useState(MasterPasswordStatus.NotSet);
	const [currentPassword, setCurrentPassword] = useState('');
	const [currentPasswordIsValid, setCurrentPasswordIsValid] = useState(false);
	const [password1, setPassword1] = useState('');
	const [password2, setPassword2] = useState('');
	const [saveButtonDisabled, setSaveButtonDisabled] = useState(true);
	const [showPasswordForm, setShowPasswordForm] = useState(false);
	const [updatingPassword, setUpdatingPassword] = useState(false);

	function closeDialog(dispatch: Function) {
		dispatch({
			type: 'DIALOG_CLOSE',
			name: 'masterPassword',
		});
	}

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const newStatus = await getMasterPasswordStatus();
		if (event.cancelled) return;
		setStatus(newStatus);
	}, []);

	const onButtonRowClick = useCallback(async (event: ClickEvent) => {
		if (event.buttonName === 'cancel') {
			closeDialog(props.dispatch);
			return;
		}

		if (event.buttonName === 'ok') {
			setUpdatingPassword(true);
			try {
				await updateMasterPassword(currentPassword, password1, () => reg.waitForSyncFinishedThenSync());
				closeDialog(props.dispatch);
			} catch (error) {
				alert(error.message);
			} finally {
				setUpdatingPassword(false);
			}
			return;
		}
	}, [props.dispatch, currentPassword, password1]);

	const onCurrentPasswordChange = useCallback((event: any) => {
		setCurrentPassword(event.target.value);
	}, []);

	const onPasswordChange1 = useCallback((event: any) => {
		setPassword1(event.target.value);
	}, []);

	const onPasswordChange2 = useCallback((event: any) => {
		setPassword2(event.target.value);
	}, []);

	const onShowPasswordForm = useCallback(() => {
		setShowPasswordForm(true);
	}, []);

	useEffect(() => {
		setSaveButtonDisabled(updatingPassword || (!password1 || password1 !== password2));
	}, [password1, password2, updatingPassword]);

	useEffect(() => {
		setShowPasswordForm(status === MasterPasswordStatus.NotSet);
	}, [status]);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const isValid = currentPassword ? await masterPasswordIsValid(currentPassword) : false;
		if (event.cancelled) return;
		setCurrentPasswordIsValid(isValid);
	}, [currentPassword]);

	function renderCurrentPasswordIcon() {
		if (!currentPassword || status === MasterPasswordStatus.NotSet) return null;
		return currentPasswordIsValid ? <i className="fas fa-check"></i> : <i className="fas fa-times"></i>;
	}

	function renderPasswordForm() {
		if (showPasswordForm) {
			return (
				<div>
					<div className="form">
						<div className="form-input-group">
							<label>{'Current password'}</label>
							<div className="current-password-wrapper">
								<StyledInput
									disabled={status === MasterPasswordStatus.NotSet}
									placeholder={status === MasterPasswordStatus.NotSet ? `(${_('Not set')})` : ''}
									type="password"
									value={currentPassword}
									onChange={onCurrentPasswordChange}
								/>
								{renderCurrentPasswordIcon()}
							</div>
						</div>
						<div className="form-input-group">
							<label>{'Enter password'}</label>
							<StyledInput type="password" value={password1} onChange={onPasswordChange1}/>
						</div>
						<div className="form-input-group">
							<label>{'Re-enter password'}</label>
							<StyledInput type="password" value={password2} onChange={onPasswordChange2}/>
						</div>
					</div>
					<p className="bold">Please make sure you remember your password. For security reasons, it is not possible to recover it if it is lost.</p>
				</div>
			);
		} else {
			return (
				<p>
					<a onClick={onShowPasswordForm} href="#">Change master password</a>
				</p>
			);
		}
	}

	function renderContent() {
		return (
			<div className="dialog-content">
				<p>Your master password is used to protect sensitive information. In particular, it is used to encrypt your notes when end-to-end encryption (E2EE) is enabled, or to share and encrypt notes with someone who has E2EE enabled.</p>
				<p>
					<span>{'Master password status:'}</span> <span className="bold">{getMasterPasswordStatusMessage(status)}</span>
				</p>
				{renderPasswordForm()}
			</div>
		);
	}

	function renderDialogWrapper() {
		return (
			<div className="dialog-root">
				<DialogTitle title={_('Master password')}/>
				{renderContent()}
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					okButtonLabel={_('Save')}
					okButtonDisabled={saveButtonDisabled}
					cancelButtonDisabled={updatingPassword}
				/>
			</div>
		);
	}

	return (
		<Dialog className="master-password-dialog" renderContent={renderDialogWrapper}/>
	);
}
