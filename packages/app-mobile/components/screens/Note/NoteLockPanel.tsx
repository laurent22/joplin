import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { themeStyle } from '../../global-style';
import { _ } from '@joplin/lib/locale';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
import NavService from '@joplin/lib/services/NavService';
import Icon from '../../Icon';

interface Props {
	themeId: number;
	hasNoteLockKey: boolean;
	onUnlocked?: ()=> void;
}

const NoteLockPanel = (props: Props) => {
	const [password, setPassword] = useState('');
	const [unlocking, setUnlocking] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const theme = useMemo(() => themeStyle(props.themeId), [props.themeId]);

	const styles = useMemo(() => {
		return StyleSheet.create({
			container: {
				flex: 1,
				padding: theme.margin,
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: theme.backgroundColor,
			},
			icon: {
				fontSize: 40,
				color: theme.colorFaded,
				marginBottom: theme.marginBottom,
			},
			message: {
				fontSize: theme.fontSize,
				color: theme.color,
				textAlign: 'center',
				marginBottom: theme.marginBottom,
			},
			passwordInput: {
				alignSelf: 'stretch',
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
				alignSelf: 'stretch',
			},
		});
	}, [theme]);

	const onSetUp = useCallback(() => {
		void NavService.go('Config', { sectionName: 'noteLock' });
	}, []);

	const onUnlock = useCallback(async () => {
		if (!password || unlocking) return;
		setUnlocking(true);
		try {
			await NoteLockSession.instance().unlock(password);
			props.onUnlocked?.();
		} catch (error) {
			// WebCrypto reports a wrong password as a generic OperationError.
			setErrorMessage(error.name === 'OperationError' ? _('Invalid password') : error.message);
			setUnlocking(false);
		}
	}, [password, unlocking, props.onUnlocked]);

	const renderForm = () => {
		if (!props.hasNoteLockKey) {
			return (
				<>
					<Text style={styles.message}>{_('Reading this note requires the note lock password, which has not been set up on this device yet.')}</Text>
					<View style={styles.buttonContainer}>
						<Button title={_('Set up note lock')} onPress={onSetUp} />
					</View>
				</>
			);
		}

		return (
			<>
				<Text style={styles.message}>{_('This note is encrypted. Enter the note lock password to unlock encrypted notes for this session.')}</Text>
				<TextInput
					style={styles.passwordInput}
					secureTextEntry={true}
					autoCapitalize='none'
					autoCorrect={false}
					textContentType='password'
					value={password}
					onChangeText={setPassword}
					onSubmitEditing={onUnlock}
					placeholder={_('Note lock password')}
					placeholderTextColor={theme.colorFaded}
					accessibilityLabel={_('Note lock password')}
				/>
				{!!errorMessage && <Text style={styles.errorText} role='alert'>{errorMessage}</Text>}
				<View style={styles.buttonContainer}>
					<Button title={_('Unlock')} onPress={onUnlock} disabled={!password || unlocking} />
				</View>
			</>
		);
	};

	return (
		<View style={styles.container}>
			<Icon name='fas fa-lock' style={styles.icon} accessibilityLabel={_('Locked note')} />
			{renderForm()}
		</View>
	);
};

export default NoteLockPanel;
