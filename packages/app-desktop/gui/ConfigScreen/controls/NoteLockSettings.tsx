import * as React from 'react';
import { useCallback, useState } from 'react';
import { connect } from 'react-redux';
import { _ } from '@joplin/lib/locale';
import NoteLockKey from '@joplin/lib/services/noteLock/NoteLockKey';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
import shim, { MessageBoxType } from '@joplin/lib/shim';
import { SyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import LabelledPasswordInput from '../../PasswordInput/LabelledPasswordInput';
import Button, { ButtonLevel } from '../../Button/Button';
import { AppState } from '../../../app.reducer';
import useNoteLockMode, { ActionMode } from './useNoteLockMode';

interface Props {
	hasNoteLockKey: boolean;
	needsNoteLockKeyUpgrade: boolean;
}

// WebCrypto reports a wrong password as an OperationError with an unhelpful generic message
const errorMessage = (error: unknown) => {
	if (!(error instanceof Error)) return String(error);
	if (error.name === 'OperationError') return _('Invalid password');
	return error.message;
};

const NoteLockSettings: React.FC<Props> = props => {
	const hasKey = props.hasNoteLockKey;
	const {
		mode,
		onModeChange,
		currentPassword,
		setCurrentPassword,
		password,
		setPassword,
		passwordRepeat,
		setPasswordRepeat,
		error,
		setError,
	} = useNoteLockMode(hasKey);

	const [upgradePassword, setUpgradePassword] = useState('');
	const [upgradeError, setUpgradeError] = useState('');
	const [saving, setSaving] = useState(false);

	const passwordMismatch = !!passwordRepeat && password !== passwordRepeat;
	const canSave = !!password && !!passwordRepeat && !passwordMismatch && !saving && (mode !== ActionMode.Change || !!currentPassword);
	const canUpgrade = !!upgradePassword && !saving;

	const forgotPasswordDescription = _('Only do this if you\'ve forgotten your current password. A new password will be created, and any notes locked with the old one will become permanently unreadable.');
	const forgotPasswordWarning = `${_('Warning:')} ${forgotPasswordDescription}`;
	const resetConfirmationMessage = `${forgotPasswordWarning}\n\n${_('Continue?')}`;

	const onCurrentPasswordChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setCurrentPassword(event.target.value);
	}, [setCurrentPassword]);

	const onPasswordChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setPassword(event.target.value);
	}, [setPassword]);

	const onPasswordRepeatChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setPasswordRepeat(event.target.value);
	}, [setPasswordRepeat]);

	const onUpgradePasswordChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setUpgradePassword(event.target.value);
	}, []);

	const submit = useCallback(async () => {
		if (!canSave) return;
		if (mode === ActionMode.Reset) {
			const response = await shim.showMessageBox(resetConfirmationMessage, {
				buttons: [_('Yes'), _('No')],
				type: MessageBoxType.Confirm,
			});
			if (response !== 0) return;
		}

		setSaving(true);
		setError('');
		try {
			const noteLockKey = NoteLockKey.instance();
			if (mode === ActionMode.Create) {
				await noteLockKey.create(password);
			} else if (mode === ActionMode.Change) {
				await noteLockKey.changePassword(currentPassword, password);
			} else if (mode === ActionMode.Reset) {
				await NoteLockSession.instance().reset(password);
			}
			onModeChange(ActionMode.Collapsed);
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			setSaving(false);
		}
	}, [canSave, onModeChange, currentPassword, mode, password, setError, resetConfirmationMessage]);

	const submitUpgrade = useCallback(async () => {
		if (!canUpgrade) return;

		setSaving(true);
		setUpgradeError('');
		try {
			await NoteLockKey.instance().upgrade(upgradePassword);
			setUpgradePassword('');
		} catch (error) {
			setUpgradeError(errorMessage(error));
		} finally {
			setSaving(false);
		}
	}, [canUpgrade, upgradePassword]);

	const onChangePasswordClick = useCallback(() => {
		onModeChange(ActionMode.Change);
	}, [onModeChange]);

	const onForgotPasswordClick = useCallback(() => {
		onModeChange(ActionMode.Reset);
	}, [onModeChange]);

	const onCancel = useCallback(() => {
		onModeChange(ActionMode.Collapsed);
	}, [onModeChange]);

	const resetPasswordTitle = `⚠️ ${_('Reset password')} ⚠️`;
	const actionButtonTitle = mode === ActionMode.Reset ? resetPasswordTitle : _('Save');

	const getSectionTitle = () => {
		if (mode === ActionMode.Reset) return resetPasswordTitle;
		if (mode === ActionMode.Change) return _('Change note lock password');
		if (mode === ActionMode.Collapsed) return _('Manage password');
		return _('Password setup');
	};

	const renderManageButtons = () => {
		return (
			<div className='form'>
				<div className='buttons'>
					<Button
						title={_('Change note lock password')}
						level={ButtonLevel.Secondary}
						onClick={onChangePasswordClick}
					/>
				</div>
				<div className='buttons'>
					<Button
						title={_('Forgot password?')}
						level={ButtonLevel.Secondary}
						onClick={onForgotPasswordClick}
					/>
				</div>
				<p className='description'>{forgotPasswordDescription}</p>
			</div>
		);
	};

	const renderPasswordForm = () => {
		return (
			<div className='form'>
				{mode === ActionMode.Reset && <p className='warning' role='alert'><strong>{_('Warning:')}</strong> {forgotPasswordDescription}</p>}
				{mode === ActionMode.Change && (
					<LabelledPasswordInput
						labelText={_('Current password')}
						value={currentPassword}
						onChange={onCurrentPasswordChange}
						reserveIconGutter={true}
					/>
				)}
				<LabelledPasswordInput
					labelText={mode === ActionMode.Create ? _('Password') : _('New password')}
					value={password}
					onChange={onPasswordChange}
					reserveIconGutter={true}
				/>
				<LabelledPasswordInput
					labelText={_('Repeat password')}
					value={passwordRepeat}
					onChange={onPasswordRepeatChange}
					valid={passwordRepeat ? !passwordMismatch : undefined}
					reserveIconGutter={true}
				/>
				{passwordMismatch && <p className='error'>{_('Passwords do not match')}</p>}
				{error ? <p className='error' role='alert'>{error}</p> : null}
				<div className='buttons'>
					<Button
						title={actionButtonTitle}
						level={mode === ActionMode.Reset ? ButtonLevel.Secondary : ButtonLevel.Primary}
						disabled={!canSave}
						onClick={submit}
					/>
					{mode !== ActionMode.Create && (
						<Button
							title={_('Cancel')}
							level={ButtonLevel.Secondary}
							disabled={saving}
							onClick={onCancel}
						/>
					)}
				</div>
				<p className='reminder'><strong>{_('Please make sure you remember your password. It cannot be recovered if lost, and any data encrypted with it will become inaccessible.')}</strong></p>
			</div>
		);
	};

	const renderUpgradeSection = () => {
		if (!props.needsNoteLockKeyUpgrade) return null;

		return (
			<div className='section'>
				<h2>{_('Key upgrade')}</h2>
				<p>{_('The note lock key uses an out-dated encryption algorithm and it is recommended to upgrade it. The upgraded key will still be able to decrypt and encrypt your data as usual.')}</p>
				<div className='form'>
					<LabelledPasswordInput
						labelText={_('Password')}
						value={upgradePassword}
						onChange={onUpgradePasswordChange}
						reserveIconGutter={true}
					/>
					{upgradeError ? <p className='error' role='alert'>{upgradeError}</p> : null}
					<div className='buttons'>
						<Button
							title={_('Upgrade key')}
							level={ButtonLevel.Primary}
							disabled={!canUpgrade}
							onClick={submitUpgrade}
						/>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className='note-lock-settings'>
			<div className='section'>
				<h2>{getSectionTitle()}</h2>
				{mode === ActionMode.Collapsed ? renderManageButtons() : renderPasswordForm()}
			</div>
			{renderUpgradeSection()}
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		hasNoteLockKey: !!new SyncInfo(state.settings['syncInfoCache']).noteLockKey,
		needsNoteLockKeyUpgrade: NoteLockKey.instance().needsUpgrade(),
	};
};

export default connect(mapStateToProps)(NoteLockSettings);
