import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, Switch, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import ScreenHeader from '../ScreenHeader';
import { themeStyle } from '../global-style';
import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import NoteLockKey from '@joplin/lib/services/noteLock/NoteLockKey';
import { SyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import { State } from '@joplin/lib/reducer';

interface Props {
	themeId: number;
	hasNoteLockKey: boolean;
	lockOnNoteSwitch: boolean;
}

const NoteLockConfigScreen = (props: Props) => {
	const [password, setPassword] = useState('');
	const [passwordRepeat, setPasswordRepeat] = useState('');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);

	const theme = useMemo(() => themeStyle(props.themeId), [props.themeId]);

	const styles = useMemo(() => {
		return StyleSheet.create({
			root: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
			container: {
				flex: 1,
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
				marginBottom: 10,
				color: theme.color,
				borderWidth: 1,
				borderColor: theme.dividerColor,
				borderRadius: 3,
				padding: 10,
			},
			errorText: {
				fontSize: theme.fontSize,
				color: theme.colorError,
				marginBottom: 10,
			},
			reminderText: {
				fontSize: theme.fontSize,
				fontWeight: 'bold',
				color: theme.color,
				marginTop: 10,
			},
			sessionRow: {
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-between',
				marginTop: 5,
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

	const onAutoLockChange = useCallback((value: boolean) => {
		Setting.setValue('noteLock.lockOnNoteSwitch', value);
	}, []);

	const passwordLabelId = 'note-lock-password';
	const repeatLabelId = 'note-lock-password-repeat';
	const autoLockLabelId = 'note-lock-auto-lock';

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
					onChangeText={setPassword}
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
					onChangeText={setPasswordRepeat}
				/>
				{passwordMismatch ? <Text style={styles.errorText}>{_('Passwords do not match')}</Text> : null}
				{error ? <Text style={styles.errorText}>{error}</Text> : null}
				<Button title={_('Save')} disabled={!canSave} onPress={() => void onCreate()} />
				<Text style={styles.reminderText}>{_('Please make sure you remember your password. It cannot be recovered if lost, and any data encrypted with it will become inaccessible.')}</Text>
			</View>
		);
	};

	return (
		<View style={styles.root}>
			<ScreenHeader title={_('Note Lock Config')} />
			<ScrollView>
				<View style={styles.container}>
					<Text style={styles.normalText}>{_('Note lock protects notes which have note level encryption enabled. These notes are encrypted when stored, and are only decrypted for the current session by entering the note lock password')}</Text>
					<Text style={styles.normalText}><Text style={styles.boldText}>{_('Note lock password:')}</Text> {hasKey ? _('Set') : _('Not set')}</Text>

					{renderPasswordSetup()}

					<Text style={styles.titleText} accessibilityRole='header'>{_('Session')}</Text>
					<View style={styles.sessionRow}>
						<Text nativeID={autoLockLabelId} style={styles.normalText}>{_('Auto lock when switching note')}</Text>
						<Switch accessibilityLabelledBy={autoLockLabelId} value={props.lockOnNoteSwitch} onValueChange={onAutoLockChange} />
					</View>
				</View>
			</ScrollView>
		</View>
	);
};

export default connect((state: State) => {
	return {
		themeId: state.settings.theme,
		hasNoteLockKey: !!new SyncInfo(state.settings['syncInfoCache']).noteLockKey,
		lockOnNoteSwitch: state.settings['noteLock.lockOnNoteSwitch'],
	};
})(NoteLockConfigScreen);
