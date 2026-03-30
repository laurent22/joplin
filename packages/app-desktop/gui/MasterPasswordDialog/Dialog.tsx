import * as React from 'react';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { _ } from '@joplin/lib/locale';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import DialogButtonRow, { ClickEvent } from '../DialogButtonRow';
import Dialog from '@joplin/lib/components/Dialog';
import DialogTitle from '../DialogTitle';
import {
	getMasterPasswordStatus,
	getMasterPasswordStatusMessage,
	checkHasMasterPasswordEncryptedData,
	masterPasswordIsValid,
	MasterPasswordStatus,
	resetMasterPassword,
	updateMasterPassword,
	getMasterPassword,
} from '@joplin/lib/services/e2ee/utils';
import { reg } from '@joplin/lib/registry';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import KvStore from '@joplin/lib/services/KvStore';
import ShareService from '@joplin/lib/services/share/ShareService';
import LabelledPasswordInput from '../PasswordInput/LabelledPasswordInput';
import shim from '@joplin/lib/shim';
// @ts-ignore
import PasswordStrengthMeter from './PasswordStrengthMeter';
import { checkPasswordStrength } from '@joplin/lib/passwordStrength';
import { PasswordStrengthResult } from '@joplin/lib/passwordStrength';

interface Props {
	themeId: number;
	dispatch: Function;
}

enum Mode {
	Set = 1,
	Reset = 2,
}

export default function (props: Props) {
	const [status, setStatus] = useState(MasterPasswordStatus.NotSet);
	const [hasMasterPasswordEncryptedData, setHasMasterPasswordEncryptedData] = useState(true);
	const [currentPassword, setCurrentPassword] = useState('');
	const [currentPasswordIsValid, setCurrentPasswordIsValid] = useState(false);
	const [password1, setPassword1] = useState('');
	const [password2, setPassword2] = useState('');

	// ✅ NEW STATE
	const [strength, setStrength] = useState<PasswordStrengthResult>({
		score: 0,
		label: 'Weak',
		suggestions: [],
		ruleIssues: [],
		isCompromised: false,
	});

	const [saveButtonDisabled, setSaveButtonDisabled] = useState(true);
	const [showPasswordForm, setShowPasswordForm] = useState(false);
	const [updatingPassword, setUpdatingPassword] = useState(false);
	const [mode, setMode] = useState<Mode>(Mode.Set);

	const showCurrentPassword = useMemo(() => {
		if ([MasterPasswordStatus.NotSet, MasterPasswordStatus.Invalid].includes(status)) return false;
		if (mode === Mode.Reset) return false;
		return true;
	}, [status, mode]);

	const onClose = useCallback(() => {
		props.dispatch({
			type: 'DIALOG_CLOSE',
			name: 'masterPassword',
		});
	}, [props.dispatch]);

	useEffect(() => {
		setCurrentPassword(getMasterPassword(false) || '');
	}, []);

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
					await updateMasterPassword(showCurrentPassword ? currentPassword : null, password1);
				} else if (mode === Mode.Reset) {
					await resetMasterPassword(
						EncryptionService.instance(),
						KvStore.instance(),
						ShareService.instance(),
						password1
					);
				} else {
					throw new Error(`Unknown mode: ${mode}`);
				}
				void reg.waitForSyncFinishedThenSync();
				onClose();
			} catch (error) {
				void shim.showErrorDialog(error.message);
			} finally {
				setUpdatingPassword(false);
			}
			return;
		}
	}, [currentPassword, password1, onClose, mode, showCurrentPassword]);

	const needToRepeatPassword = useMemo(() => {
		if (mode === Mode.Reset) return true;
		return !hasMasterPasswordEncryptedData;
	}, [hasMasterPasswordEncryptedData, mode]);

	const onCurrentPasswordChange = useCallback((event: any) => {
		setCurrentPassword(event.target.value);
	}, []);

	// ✅ UPDATED HANDLER
	const onPasswordChange1 = useCallback(async (event: ChangeEvent) => {
		const value = event.target.value;
		setPassword1(value);

		const result = await checkPasswordStrength(value);
		setStrength(result);
	}, []);

	const onPasswordChange2 = useCallback((event: any) => {
		setPassword2(event.target.value);
	}, []);

	const onShowPasswordForm = useCallback(() => {
		setShowPasswordForm(true);
	}, []);

	const onToggleMode = useCallback(() => {
		setMode(m => (m === Mode.Set ? Mode.Reset : Mode.Set));
		setCurrentPassword('');
		setPassword1('');
		setPassword2('');
	}, []);

	useEffect(() => {
		setSaveButtonDisabled(
			updatingPassword ||
			(!password1 || (needToRepeatPassword && password1 !== password2))
		);
	}, [password1, password2, updatingPassword, needToRepeatPassword]);

	useEffect(() => {
		setShowPasswordForm(
			[MasterPasswordStatus.NotSet, MasterPasswordStatus.Invalid].includes(status)
		);
	}, [status]);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const isValid = currentPassword ? await masterPasswordIsValid(currentPassword) : false;
		if (event.cancelled) return;
		setCurrentPasswordIsValid(isValid);
	}, [currentPassword]);

	function renderPasswordForm() {
		const renderCurrentPassword = () => {
			if (!showCurrentPassword) return null;

			const showValidIcon = currentPassword && status !== MasterPasswordStatus.NotSet;
			return (
				<LabelledPasswordInput
					labelText={_('Current password')}
					value={currentPassword}
					onChange={onCurrentPasswordChange}
					valid={showValidIcon ? currentPasswordIsValid : undefined}
				/>
			);
		};

		const renderResetMasterPasswordLink = () => {
			if (mode === Mode.Reset) return null;
			if (status === MasterPasswordStatus.Valid) return null;
			return <p><a href="#" onClick={onToggleMode}>Reset master password</a></p>;
		};

		if (showPasswordForm) {
			const enterPasswordLabel =
				[MasterPasswordStatus.Loaded, MasterPasswordStatus.Valid].includes(status)
					? 'Enter new password'
					: 'Enter password';

			return (
				<div>
					<div className="form">
						{renderCurrentPassword()}

						{/* PASSWORD INPUT */}
						<LabelledPasswordInput
							labelText={enterPasswordLabel}
							value={password1}
							onChange={onPasswordChange1}
						/>

						{/* ✅ STRENGTH METER */}
						{password1 && (
							<PasswordStrengthMeter
								score={strength.score}
								label={strength.label}
								suggestions={strength.suggestions}
								ruleIssues={strength.ruleIssues}
								Iscompromised={strength.isCompromised}
								
							/>
						)}

						{needToRepeatPassword && (
							<LabelledPasswordInput
								labelText={_('Re-enter password')}
								value={password2}
								onChange={onPasswordChange2}
							/>
						)}
					</div>

					<p className="bold">
						Please make sure you remember your master password. For security reasons,
						it cannot be recovered if lost, and any data encrypted with it may become inaccessible.
					</p>

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
					<p>
						Attention: After resetting your password it will no longer be possible
						to decrypt any data encrypted with your current password.
					</p>
					{renderPasswordForm()}
				</div>
			);
		} else {
			return (
				<div className="dialog-content">
					<p>
						Your master password is used to protect sensitive information.
					</p>
					<p>
						<span>Master password status:</span>{' '}
						<span className="bold">{getMasterPasswordStatusMessage(status)}</span>
					</p>
					{renderPasswordForm()}
				</div>
			);
		}
	}

	const dialogTitle =
		mode === Mode.Set ? _('Manage master password') : `⚠️ ${_('Reset master password')} ⚠️`;

	const okButtonLabel =
		mode === Mode.Set ? _('Save') : `⚠️ ${_('Reset master password')} ⚠️`;

	return (
		<Dialog onCancel={onClose} className="master-password-dialog">
			<div className="dialog-root">
				<DialogTitle title={dialogTitle} />
				{renderContent()}
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					okButtonLabel={okButtonLabel}
					okButtonDisabled={saveButtonDisabled}
					cancelButtonDisabled={updatingPassword}
				/>
			</div>
		</Dialog>
	);
}