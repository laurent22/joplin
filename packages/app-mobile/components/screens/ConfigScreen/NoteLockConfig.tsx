import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { themeStyle } from '../../global-style';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import NoteLockKey from '@joplin/lib/services/noteLock/NoteLockKey';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
import { SyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import useNoteLockMode, { ActionMode } from '@joplin/lib/components/shared/config/useNoteLockMode';
import { PrimaryButton, SecondaryButton } from '../../buttons';
import { State } from '@joplin/lib/reducer';

interface Props {
	themeId: number;
	hasNoteLockKey: boolean;
}

const NoteLockConfig = (props: Props) => {
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
	const [saving, setSaving] = useState(false);

	const theme = useMemo(() => themeStyle(props.themeId), [props.themeId]);

	const styles = useMemo(() => {
		return StyleSheet.create({
			container: {
				padding: theme.margin,
			},
			titleText: {
				fontWeight: 'bold',
				fontSize: theme.fontSize,
				marginTop: theme.marginTop,
				marginBottom: 5,
				color: theme.color,
			},
			normalText: {
				fontSize: theme.fontSize,
				color: theme.color,
				marginBottom: 5,
			},
			boldText: {
				fontWeight: 'bold',
			},
			passwordInput: {
				marginTop: 5,
				marginBottom: theme.itemMarginBottom,
				color: theme.color,
				borderWidth: 1,
				borderColor: theme.dividerColor,
				borderRadius: 3,
				padding: 10,
			},
			errorText: {
				fontSize: theme.fontSize,
				color: theme.colorError,
				marginBottom: theme.itemMarginBottom,
			},
			reminderText: {
				fontSize: theme.fontSize,
				fontWeight: 'bold',
				color: theme.color,
				marginTop: theme.itemMarginTop,
			},
			button: {
				marginBottom: theme.itemMarginBottom,
			},
		});
	}, [theme]);

	const passwordMismatch = !!passwordRepeat && password !== passwordRepeat;
	const canSave = !!password && !!passwordRepeat && !passwordMismatch && !saving && (mode !== ActionMode.Change || !!currentPassword);

	const forgotPasswordDescription = _('Only do this if you\'ve forgotten your current password. A new password will be created, and any notes locked with the old one will become permanently unreadable.');

	const onSave = useCallback(async () => {
		if (!canSave) return;
		if (mode === ActionMode.Reset && !await shim.showConfirmationDialog(`${_('Warning:')} ${forgotPasswordDescription}\n\n${_('Continue?')}`)) return;

		setSaving(true);
		setError('');
		try {
			if (mode === ActionMode.Create) {
				await NoteLockKey.instance().create(password);
			} else if (mode === ActionMode.Change) {
				await NoteLockKey.instance().changePassword(currentPassword, password);
			} else if (mode === ActionMode.Reset) {
				await NoteLockSession.instance().reset(password);
			}
			onModeChange(ActionMode.Collapsed);
		} catch (error) {
			// WebCrypto reports a wrong current password as a generic OperationError.
			setError(error.name === 'OperationError' ? _('Invalid password') : error.message);
		} finally {
			setSaving(false);
		}
	}, [canSave, mode, password, currentPassword, forgotPasswordDescription, onModeChange, setError]);

	const onCurrentPasswordChange = useCallback((value: string) => {
		setCurrentPassword(value);
		setError('');
	}, [setCurrentPassword, setError]);

	const onPasswordChange = useCallback((value: string) => {
		setPassword(value);
		setError('');
	}, [setPassword, setError]);

	const onPasswordRepeatChange = useCallback((value: string) => {
		setPasswordRepeat(value);
		setError('');
	}, [setPasswordRepeat, setError]);

	const renderPasswordInput = (labelId: string, label: string, value: string, onChange: (value: string)=> void, isNewPassword: boolean) => {
		return <>
			<Text nativeID={labelId} style={styles.normalText}>{label}</Text>
			<TextInput
				accessibilityLabelledBy={labelId}
				selectionColor={theme.textSelectionColor}
				keyboardAppearance={theme.keyboardAppearance}
				style={styles.passwordInput}
				secureTextEntry={true}
				autoCapitalize='none'
				autoCorrect={false}
				textContentType={isNewPassword ? 'newPassword' : 'password'}
				importantForAutofill='yes'
				value={value}
				onChangeText={onChange}
			/>
		</>;
	};

	const renderManageButtons = () => {
		return (
			<View>
				<Text style={styles.titleText} accessibilityRole='header'>{_('Manage password')}</Text>
				<SecondaryButton style={styles.button} onPress={() => onModeChange(ActionMode.Change)}>{_('Change note lock password')}</SecondaryButton>
				<SecondaryButton style={styles.button} onPress={() => onModeChange(ActionMode.Reset)}>{_('Forgot password?')}</SecondaryButton>
				<Text style={styles.normalText}>{forgotPasswordDescription}</Text>
			</View>
		);
	};

	const renderPasswordForm = () => {
		const resetPasswordTitle = `⚠️ ${_('Reset password')} ⚠️`;
		let title = _('Password setup');
		if (mode === ActionMode.Change) title = _('Change note lock password');
		if (mode === ActionMode.Reset) title = resetPasswordTitle;
		// The sync advice only applies to a first setup, where there may be nothing to lose yet.
		const passwordReminder = mode === ActionMode.Create ?
			_('Please make sure you remember your password. It cannot be recovered if lost, and any locked notes will become inaccessible. If you have already set up the note lock password on another device, there is no need to set it again, as the information required to access your locked notes is updated when you set up sync.') :
			_('Please make sure you remember your password. It cannot be recovered if lost, and any locked notes will become inaccessible.');

		return (
			<View>
				<Text style={styles.titleText} accessibilityRole='header'>{title}</Text>
				{mode === ActionMode.Reset ? <Text style={styles.errorText}><Text style={styles.boldText}>{_('Warning:')}</Text> {forgotPasswordDescription}</Text> : null}
				{mode === ActionMode.Change ? renderPasswordInput('note-lock-current-password', _('Current password'), currentPassword, onCurrentPasswordChange, false) : null}
				{renderPasswordInput('note-lock-password', mode === ActionMode.Create ? _('Password') : _('New password'), password, onPasswordChange, true)}
				{renderPasswordInput('note-lock-password-repeat', _('Repeat password'), passwordRepeat, onPasswordRepeatChange, true)}
				{passwordMismatch ? <Text style={styles.errorText}>{_('Passwords do not match')}</Text> : null}
				{error ? <Text style={styles.errorText}>{error}</Text> : null}
				{mode === ActionMode.Reset ?
					<SecondaryButton style={styles.button} disabled={!canSave} onPress={onSave}>{resetPasswordTitle}</SecondaryButton> :
					<PrimaryButton style={styles.button} disabled={!canSave} onPress={onSave}>{_('Save')}</PrimaryButton>}
				{mode !== ActionMode.Create ? <SecondaryButton disabled={saving} onPress={() => onModeChange(ActionMode.Collapsed)}>{_('Cancel')}</SecondaryButton> : null}
				<Text style={styles.reminderText}>{passwordReminder}</Text>
			</View>
		);
	};

	return (
		<View style={styles.container}>
			<Text style={styles.normalText}><Text style={styles.boldText}>{_('Note lock password:')}</Text> {hasKey ? _('Set') : _('Not set')}</Text>
			{mode === ActionMode.Collapsed ? renderManageButtons() : renderPasswordForm()}
		</View>
	);
};

export default connect((state: State) => {
	return {
		themeId: state.settings.theme,
		hasNoteLockKey: !!new SyncInfo(state.settings['syncInfoCache']).noteLockKey,
	};
})(NoteLockConfig);
