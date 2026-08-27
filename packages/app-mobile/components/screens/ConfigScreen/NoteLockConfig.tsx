import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { themeStyle } from '../../global-style';
import { _ } from '@joplin/lib/locale';
import NoteLockKey from '@joplin/lib/services/noteLock/NoteLockKey';
import { SyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import { PrimaryButton } from '../../buttons';
import { State } from '@joplin/lib/reducer';

interface Props {
	themeId: number;
	hasNoteLockKey: boolean;
}

const NoteLockConfig = (props: Props) => {
	const [password, setPassword] = useState('');
	const [passwordRepeat, setPasswordRepeat] = useState('');
	const [error, setError] = useState('');
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
		});
	}, [theme]);

	const hasKey = props.hasNoteLockKey;
	const passwordMismatch = !!passwordRepeat && password !== passwordRepeat;
	const canSave = !!password && !!passwordRepeat && !passwordMismatch && !saving;

	const onCreate = useCallback(async () => {
		if (!canSave) return;
		setSaving(true);
		setError('');
		try {
			await NoteLockKey.instance().create(password);
			setPassword('');
			setPasswordRepeat('');
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error));
		} finally {
			setSaving(false);
		}
	}, [canSave, password]);

	const onPasswordChange = useCallback((value: string) => {
		setPassword(value);
		setError('');
	}, []);

	const onPasswordRepeatChange = useCallback((value: string) => {
		setPasswordRepeat(value);
		setError('');
	}, []);

	const passwordLabelId = 'note-lock-password';
	const repeatLabelId = 'note-lock-password-repeat';

	const renderPasswordSetup = () => {
		if (hasKey) return null;
		return (
			<View>
				<Text style={styles.titleText} accessibilityRole='header'>{_('Password setup')}</Text>
				<Text nativeID={passwordLabelId} style={styles.normalText}>{_('Password')}</Text>
				<TextInput
					accessibilityLabelledBy={passwordLabelId}
					selectionColor={theme.textSelectionColor}
					keyboardAppearance={theme.keyboardAppearance}
					style={styles.passwordInput}
					secureTextEntry={true}
					autoCapitalize='none'
					autoCorrect={false}
					textContentType='newPassword'
					importantForAutofill='yes'
					value={password}
					onChangeText={onPasswordChange}
				/>
				<Text nativeID={repeatLabelId} style={styles.normalText}>{_('Repeat password')}</Text>
				<TextInput
					accessibilityLabelledBy={repeatLabelId}
					selectionColor={theme.textSelectionColor}
					keyboardAppearance={theme.keyboardAppearance}
					style={styles.passwordInput}
					secureTextEntry={true}
					autoCapitalize='none'
					autoCorrect={false}
					textContentType='newPassword'
					importantForAutofill='yes'
					value={passwordRepeat}
					onChangeText={onPasswordRepeatChange}
				/>
				{passwordMismatch ? <Text style={styles.errorText}>{_('Passwords do not match')}</Text> : null}
				{error ? <Text style={styles.errorText}>{error}</Text> : null}
				<PrimaryButton disabled={!canSave} onPress={onCreate}>{_('Save')}</PrimaryButton>
				<Text style={styles.reminderText}>{_('Please make sure you remember your password. It cannot be recovered if lost, and any locked notes will become inaccessible. If you have already set up the note lock password on another device, there is no need to set it again, as the information required to access your locked notes is updated when you set up sync.')}</Text>
			</View>
		);
	};

	return (
		<View style={styles.container}>
			<Text style={styles.normalText}><Text style={styles.boldText}>{_('Note lock password:')}</Text> {hasKey ? _('Set') : _('Not set')}</Text>
			{renderPasswordSetup()}
		</View>
	);
};

export default connect((state: State) => {
	return {
		themeId: state.settings.theme,
		hasNoteLockKey: !!new SyncInfo(state.settings['syncInfoCache']).noteLockKey,
	};
})(NoteLockConfig);
