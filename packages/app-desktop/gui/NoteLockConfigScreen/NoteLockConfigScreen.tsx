import * as React from 'react';
import { useCallback, useState } from 'react';
import { connect } from 'react-redux';
import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import NoteLockKey from '@joplin/lib/services/noteLock/NoteLockKey';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
import { SyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import LabelledPasswordInput from '../PasswordInput/LabelledPasswordInput';
import Button, { ButtonLevel } from '../Button/Button';
import { AppState } from '../../app.reducer';
import useNoteLockMode, { ActionMode } from './useNoteLockMode';

interface Props {
	hasNoteLockKey: boolean;
	needsNoteLockKeyUpgrade: boolean;
	lockOnNoteSwitch: boolean;
}

// WebCrypto reports a wrong password as an OperationError with an unhelpful generic message
const errorMessage = (error: unknown) => {
	if (!(error instanceof Error)) return String(error);
	if (error.name === 'OperationError') return _('Invalid password');
	return error.message;
};

const NoteLockConfigScreen: React.FC<Props> = props => {
	const hasKey = props.hasNoteLockKey;
	const {
		mode,
		onModeChange,
		clearForm,
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

	const onAutoLockChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		Setting.setValue('noteLock.lockOnNoteSwitch', event.target.checked);
	}, []);

	const submit = useCallback(async () => {
		if (!canSave) return;

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
			if (mode === ActionMode.Change) {
				clearForm();
			} else {
				onModeChange(ActionMode.Change);
			}
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			setSaving(false);
		}
	}, [canSave, clearForm, onModeChange, currentPassword, mode, password, setError]);

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

	const onResetPasswordClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault();
		onModeChange(ActionMode.Reset);
	}, [onModeChange]);

	const onCancelReset = useCallback(() => {
		onModeChange(ActionMode.Change);
	}, [onModeChange]);

	const resetPasswordTitle = `⚠️ ${_('Reset password')} ⚠️`;
	const actionButtonTitle = mode === ActionMode.Reset ? resetPasswordTitle : _('Save');

	const getSectionTitle = () => {
		if (mode === ActionMode.Reset) return resetPasswordTitle;
		if (hasKey) return _('Manage password');
		return _('Password setup');
	};

	const renderPasswordForm = () => {
		return (
			<div className='form'>
				{mode === ActionMode.Reset && <p className='warning' role='alert'><strong>{_('Warning:')}</strong> {_('Reset creates a new key. Existing encrypted notes use the old key and will no longer be readable after reset.')}</p>}
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
				{hasKey && mode === ActionMode.Change && <p className='reset-link'><a href='#' onClick={onResetPasswordClick}>{_('Reset password')}</a></p>}
				<div className='buttons'>
					<Button
						title={actionButtonTitle}
						level={ButtonLevel.Primary}
						disabled={!canSave}
						onClick={submit}
					/>
					{mode === ActionMode.Reset && (
						<Button
							title={_('Cancel')}
							level={ButtonLevel.Secondary}
							disabled={saving}
							onClick={onCancelReset}
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
		<div className='note-lock-config-screen'>
			<div className='section'>
				<h2>{_('Note lock')}</h2>
				<p>{_('Note lock protects notes which have note level encryption enabled. These notes are encrypted when stored, and are only decrypted for the current session by entering the note lock password')}</p>
				<p><strong>{_('Note lock password:')}</strong> {hasKey ? _('Set') : _('Not set')}</p>
			</div>
			<div className='section'>
				<h2>{getSectionTitle()}</h2>
				{renderPasswordForm()}
			</div>
			{renderUpgradeSection()}
			<div className='section'>
				<h2>{_('Session')}</h2>
				<label className='setting-row'>
					<input
						type='checkbox'
						checked={props.lockOnNoteSwitch}
						onChange={onAutoLockChange}
					/>
					<span>{_('Auto lock when switching note')}</span>
				</label>
			</div>
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		hasNoteLockKey: !!new SyncInfo(state.settings['syncInfoCache']).noteLockKey,
		needsNoteLockKeyUpgrade: NoteLockKey.instance().needsUpgrade(),
		lockOnNoteSwitch: state.settings['noteLock.lockOnNoteSwitch'],
	};
};

export default connect(mapStateToProps)(NoteLockConfigScreen);
