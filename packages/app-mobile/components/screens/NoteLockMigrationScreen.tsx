import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { themeStyle } from '../global-style';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import { finishNoteLockKeyMigration, startNoteLockKeyMigration } from '@joplin/lib/services/noteLock/NoteLockKeyMigration';
import ScreenHeader from '../ScreenHeader';
import { PrimaryButton, SecondaryButton } from '../buttons';
import { AppState } from '../../utils/types';
import BackButtonService from '../../services/BackButtonService';

interface Props {
	themeId: number;
	dispatch: Dispatch;
}

export const NoteLockMigrationScreenComponent: React.FC<Props> = props => {
	const [localPassword, setLocalPassword] = useState('');
	const [targetPassword, setTargetPassword] = useState('');
	const [migrating, setMigrating] = useState(false);
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

	// Leaving while the passwords are checked would let the run start and navigate from under whatever screen replaced this one.
	useEffect(() => {
		if (!migrating) return () => {};
		const handler = () => true;
		BackButtonService.addHandler(handler);
		return () => BackButtonService.removeHandler(handler);
	}, [migrating]);

	// Duplicates the migrate and skip handlers in app-desktop/gui/NoteLockMigrationDialog/Dialog.tsx.
	const onMigrate = useCallback(async () => {
		setMigrating(true);
		setErrorMessage('');
		try {
			await startNoteLockKeyMigration(localPassword, targetPassword, props.dispatch, () => props.dispatch({ type: 'NAV_BACK' }));
		} catch (error) {
			setErrorMessage(error.name === 'OperationError' ? _('Invalid password') : error.message);
			setMigrating(false);
		}
	}, [localPassword, targetPassword, props.dispatch]);

	const onSkip = useCallback(async () => {
		if (!await shim.showConfirmationDialog(_('Notes still locked with the password of this device will become permanently unreadable. Continue without migrating them?'))) return;
		finishNoteLockKeyMigration();
		props.dispatch({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: null });
		props.dispatch({ type: 'NAV_BACK' });
	}, [props.dispatch]);

	const localLabelId = 'note-lock-migration-local-password';
	const targetLabelId = 'note-lock-migration-target-password';

	return (
		<View style={styles.root}>
			<ScreenHeader title={_('Migrate locked notes')} showSearchButton={false} showBackButton={!migrating} showNoteLockKeyConflictMessage={false}/>
			<View style={styles.container}>
				<Text style={styles.normalText}>{_('The sync target uses a different note lock key to the one on your device. Your locked notes must be re-encrypted with the synced key before synchronisation can continue. Locked notes cannot be read while they are being migrated.')}</Text>
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
				{!!errorMessage && <Text style={styles.errorText} role='alert'>{errorMessage}</Text>}
				<View style={styles.buttonContainer}>
					<PrimaryButton onPress={onMigrate} disabled={!localPassword || !targetPassword || migrating}>{_('Migrate')}</PrimaryButton>
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
