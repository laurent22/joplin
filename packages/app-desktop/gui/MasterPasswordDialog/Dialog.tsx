import * as React from 'react';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { _ } from '@joplin/lib/locale';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import DialogButtonRow, { ClickEvent } from '../DialogButtonRow';
import Dialog from '../Dialog';
import DialogTitle from '../DialogTitle';
import StyledInput from '../style/StyledInput';
import { getMasterPasswordStatus, getMasterPasswordStatusMessage, checkHasMasterPasswordEncryptedData, masterPasswordIsValid, MasterPasswordStatus, resetMasterPassword, updateMasterPassword } from '@joplin/lib/services/e2ee/utils';
import { reg } from '@joplin/lib/registry';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import KvStore from '@joplin/lib/services/KvStore';
import ShareService from '@joplin/lib/services/share/ShareService';

interface Props {
	themeId: number;
	dispatch: Function;
}

enum Mode {
	Set = 1,
	Reset = 2,
}

export default function(props: Props) {
	const [status, setStatus] = useState(MasterPasswordStatus.NotSet);
	const [hasMasterPasswordEncryptedData, setHasMasterPasswordEncryptedData] = useState(true);
	const [currentPassword, setCurrentPassword] = useState('');
	const [currentPasswordIsValid, setCurrentPasswordIsValid] = useState(false);
	const [password1, setPassword1] = useState('');
	const [password2, setPassword2] = useState('');
	const [saveButtonDisabled, setSaveButtonDisabled] = useState(true);
	const [showPasswordForm, setShowPasswordForm] = useState(false);
	const [updatingPassword, setUpdatingPassword] = useState(false);
	const [mode, setMode] = useState<Mode>(Mode.Set);

	const onClose = useCallback(() => {
		props.dispatch({
			type: 'DIALOG_CLOSE',
			name: 'masterPassword',
		});
	}, [props.dispatch]);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const newStatus = await getMasterPasswordStatus();
		const hasIt = await checkHasMasterPasswordEncryptedData();
		if (event.cancelled) return;
		setStatus(newStatus);
		setHasMasterPasswordEncryptedData(hasIt);
	}, []);

	const onButtonRowClick = useCallback(async (event: ClickEvent) => {
		if (event.buttonName === 'cancel') {
			onClose();
			return;
		}

		if (event.buttonName === 'ok') {
			setUpdatingPassword(true);
			try {
				if (mode === Mode.Set) {
					await updateMasterPassword(currentPassword, password1);
				} else if (mode === Mode.Reset) {
					await resetMasterPassword(EncryptionService.instance(), KvStore.instance(), ShareService.instance(), password1);
				} else {
					throw new Error(`Unknown mode: ${mode}`);
				}
				void reg.waitForSyncFinishedThenSync();
				onClose();
			} catch (error) {
				alert(error.message);
			} finally {
				setUpdatingPassword(false);
			}
			return;
		}
	}, [currentPassword, password1, onClose, mode]);

	const needToRepeatPassword = useMemo(() => {
		if (mode === Mode.Reset) return true;
		return !hasMasterPasswordEncryptedData;
	}, [hasMasterPasswordEncryptedData, mode]);

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

	const onToggleMode = useCallback(() => {
		setMode(m => {
			return m === Mode.Set ? Mode.Reset : Mode.Set;
		});
		setCurrentPassword('');
		setPassword1('');
		setPassword2('');
	}, []);

	useEffect(() => {
		setSaveButtonDisabled(updatingPassword || (!password1 || (needToRepeatPassword && password1 !== password2)));
	}, [password1, password2, updatingPassword, needToRepeatPassword]);

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
		const renderCurrentPassword = () => {
			if (status === MasterPasswordStatus.NotSet) return null;
			if (mode === Mode.Reset) return null;

			return (
				<div className="form-input-group">
					<label>{'Current password'}</label>
					<div className="current-password-wrapper">
						<StyledInput
							type="password"
							value={currentPassword}
							onChange={onCurrentPasswordChange}
						/>
						{renderCurrentPasswordIcon()}
					</div>
				</div>
			);
		};

		const renderResetMasterPasswordLink = () => {
			if (mode === Mode.Reset) return null;
			if (status === MasterPasswordStatus.Valid) return null;
			return <p><a href="#" onClick={onToggleMode}>Reset master password</a></p>;
		};

		if (showPasswordForm) {
			return (
				<div>
					<div className="form">
						{renderCurrentPassword()}
						<div className="form-input-group">
							<label>{'Enter password'}</label>
							<StyledInput type="password" value={password1} onChange={onPasswordChange1}/>
						</div>
						{needToRepeatPassword && (
							<div className="form-input-group">
								<label>{'Re-enter password'}</label>
								<StyledInput type="password" value={password2} onChange={onPasswordChange2}/>
							</div>
						)}
					</div>
					<p className="bold">Please make sure you remember your password. For security reasons, it is not possible to recover it if it is lost.</p>
					{renderResetMasterPasswordLink()}
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
		if (mode === Mode.Reset) {
			return (
				<div className="dialog-content">
					<p>Attention: After resetting your password it will no longer be possible to decrypt any data encrypted with your current password. All encrypted shared notebooks will also be unshared, so please ask the notebook owner to share it again with you.</p>
					{renderPasswordForm()}
				</div>
			);
		} else {
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
	}

	const dialogTitle = mode === Mode.Set ? _('Manage master password') : `⚠️ ${_('Reset master password')} ⚠️`;
	const okButtonLabel = mode === Mode.Set ? _('Save') : `⚠️ ${_('Reset master password')} ⚠️`;

	function renderDialogWrapper() {
		return (
			<div className="dialog-root">
				<DialogTitle title={dialogTitle}/>
				{renderContent()}
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					okButtonLabel={okButtonLabel}
					okButtonDisabled={saveButtonDisabled}
					cancelButtonDisabled={updatingPassword}
				/>
			</div>
		);
	}

	return (
		<Dialog onClose={onClose} className="master-password-dialog" renderContent={renderDialogWrapper}/>
	);
}
