import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { themeStyle } from '../global-style';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import { finishNoteLockKeyMigration, migrateLockedNotes } from '@joplin/lib/services/noteLock/NoteLockKeyMigration';
import ScreenHeader from '../ScreenHeader';
import { PrimaryButton, SecondaryButton } from '../buttons';
import { AppState } from '../../utils/types';

interface Props {
	themeId: number;
	dispatch: Dispatch;
}

export const NoteLockMigrationScreenComponent: React.FC<Props> = props => {
	const [localPassword, setLocalPassword] = useState('');
	const [targetPassword, setTargetPassword] = useState('');
	const [migrating, setMigrating] = useState(false);
	const [failedCount, setFailedCount] = useState(0);
	const [errorMessage, setErrorMessage] = useState('');

	const theme = useMemo(() => themeStyle(props.themeId), [props.themeId]);

	const styles = useMemo(() => {
		return StyleSheet.create({
			root: theme.rootStyle,
			container: {
				padding: theme.margin,
			},
			normalText: {
				fontSize: theme.fontSize,
				color: theme.color,
				marginBottom: 5,
			},
			// Same input style as ConfigScreen/NoteLockConfig.tsx
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
			buttonContainer: {
				marginTop: theme.itemMarginTop,
				gap: theme.margin,
			},
		});
	}, [theme]);

	const onDone = useCallback(() => {
		finishNoteLockKeyMigration();
		props.dispatch({ type: 'NAV_BACK' });
	}, [props.dispatch]);

	const onMigrate = useCallback(async () => {
		setMigrating(true);
		setErrorMessage('');
		let result;
		try {
			result = await migrateLockedNotes(localPassword, targetPassword);
		} catch (error) {
			setErrorMessage(error.name === 'OperationError' ? _('Invalid password') : error.message);
			setMigrating(false);
			return;
		}
		setMigrating(false);
		setFailedCount(result.failed);
		if (result.failed) return;
		onDone();
	}, [localPassword, targetPassword, onDone]);

	const onSkip = useCallback(async () => {
		if (!await shim.showConfirmationDialog(_('Notes still locked with the password of this device will become permanently unreadable. Continue without migrating them?'))) return;
		onDone();
	}, [onDone]);

	const localLabelId = 'note-lock-migration-local-password';
	const targetLabelId = 'note-lock-migration-target-password';

	return (
		<View style={styles.root}>
			<ScreenHeader title={_('Migrate locked notes')} showSearchButton={false}/>
			<View style={styles.container}>
				<Text style={styles.normalText}>{_('The sync target uses a different note lock password. Your locked notes must be re-encrypted with that password before synchronisation can continue.')}</Text>
				<Text nativeID={localLabelId} style={styles.normalText}>{_('Note lock password on this device')}</Text>
				<TextInput
					accessibilityLabelledBy={localLabelId}
					selectionColor={theme.textSelectionColor}
					keyboardAppearance={theme.keyboardAppearance}
					style={styles.passwordInput}
					secureTextEntry={true}
					autoCapitalize='none'
					autoCorrect={false}
					textContentType='password'
					value={localPassword}
					onChangeText={setLocalPassword}
				/>
				<Text nativeID={targetLabelId} style={styles.normalText}>{_('Note lock password on the sync target')}</Text>
				<TextInput
					accessibilityLabelledBy={targetLabelId}
					selectionColor={theme.textSelectionColor}
					keyboardAppearance={theme.keyboardAppearance}
					style={styles.passwordInput}
					secureTextEntry={true}
					autoCapitalize='none'
					autoCorrect={false}
					textContentType='password'
					value={targetPassword}
					onChangeText={setTargetPassword}
				/>
				{!!failedCount && <Text style={styles.errorText} role='alert'>{_('%d locked notes could not be migrated. Please try again, or skip them to continue without them.', failedCount)}</Text>}
				{!!errorMessage && <Text style={styles.errorText} role='alert'>{errorMessage}</Text>}
				<View style={styles.buttonContainer}>
					<PrimaryButton onPress={onMigrate} disabled={!localPassword || !targetPassword || migrating}>{failedCount ? _('Retry') : _('Migrate')}</PrimaryButton>
					<SecondaryButton onPress={onSkip} disabled={migrating}>{_('Skip')}</SecondaryButton>
				</View>
			</View>
		</View>
	);
};

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(NoteLockMigrationScreenComponent);
