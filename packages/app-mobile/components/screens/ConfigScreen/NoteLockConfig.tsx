import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { themeStyle } from '../../global-style';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import NoteLockKey from '@joplin/lib/services/noteLock/NoteLockKey';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
import { SyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import useNoteLockMode, { ActionMode, noteLockPasswordErrorMessage } from '@joplin/lib/components/shared/config/useNoteLockMode';
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
		saving,
		setSaving,
		passwordMismatch,
		canSave,
		forgotPasswordDescription,
		resetPasswordTitle,
		passwordReminder,
		title,
	} = useNoteLockMode(hasKey);

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
			setError(noteLockPasswordErrorMessage(error));
		} finally {
			setSaving(false);
		}
	}, [canSave, mode, password, currentPassword, forgotPasswordDescription, onModeChange, setError, setSaving]);

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

	const onChangePasswordPress = useCallback(() => {
		onModeChange(ActionMode.Change);
	}, [onModeChange]);

	const onForgotPasswordPress = useCallback(() => {
		onModeChange(ActionMode.Reset);
	}, [onModeChange]);

	const onCancelPress = useCallback(() => {
		onModeChange(ActionMode.Collapsed);
	}, [onModeChange]);

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
				<SecondaryButton style={styles.button} onPress={onChangePasswordPress}>{_('Change note lock password')}</SecondaryButton>
				<SecondaryButton style={styles.button} onPress={onForgotPasswordPress}>{_('Forgot password?')}</SecondaryButton>
				<Text style={styles.normalText}>{forgotPasswordDescription}</Text>
			</View>
		);
	};

	const renderPasswordForm = () => {
		return (
			<View>
				{mode === ActionMode.Reset ? <Text style={styles.errorText}><Text style={styles.boldText}>{_('Warning:')}</Text> {forgotPasswordDescription}</Text> : null}
				{mode === ActionMode.Change ? renderPasswordInput('note-lock-current-password', _('Current password'), currentPassword, onCurrentPasswordChange, false) : null}
				{renderPasswordInput('note-lock-password', mode === ActionMode.Create ? _('Password') : _('New password'), password, onPasswordChange, true)}
				{renderPasswordInput('note-lock-password-repeat', _('Repeat password'), passwordRepeat, onPasswordRepeatChange, true)}
				{passwordMismatch ? <Text style={styles.errorText}>{_('Passwords do not match')}</Text> : null}
				{error ? <Text style={styles.errorText}>{error}</Text> : null}
				{mode === ActionMode.Reset ?
					<SecondaryButton style={styles.button} disabled={!canSave} onPress={onSave}>{resetPasswordTitle}</SecondaryButton> :
					<PrimaryButton style={styles.button} disabled={!canSave} onPress={onSave}>{_('Save')}</PrimaryButton>}
				{mode !== ActionMode.Create ? <SecondaryButton disabled={saving} onPress={onCancelPress}>{_('Cancel')}</SecondaryButton> : null}
				<Text style={styles.reminderText}>{passwordReminder}</Text>
			</View>
		);
	};

	return (
		<View style={styles.container}>
			<Text style={styles.normalText}><Text style={styles.boldText}>{_('Note lock password:')}</Text> {hasKey ? _('Set') : _('Not set')}</Text>
			<Text style={styles.titleText} accessibilityRole='header'>{title}</Text>
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
