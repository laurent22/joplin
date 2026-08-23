import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { themeStyle } from '../../global-style';
import { _ } from '@joplin/lib/locale';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
import NavService from '@joplin/lib/services/NavService';
import Icon from '../../Icon';
import { PrimaryButton } from '../../buttons';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('NoteLockPanel');

interface Props {
	themeId: number;
	hasNoteLockKey: boolean;
	undecryptable?: boolean;
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
				// flexGrow rather than flex, so the panel fills the note screen but keeps its
				// natural height inside the auto-sized unlock dialog.
				flexGrow: 1,
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

	const mountedRef = useRef(true);
	useEffect(() => {
		return () => { mountedRef.current = false; };
	}, []);

	const onUnlock = useCallback(async () => {
		if (!password || unlocking) return;
		setUnlocking(true);
		try {
			await NoteLockSession.instance().unlock(password);
			if (!mountedRef.current) return;
			props.onUnlocked?.();
		} catch (error) {
			logger.warn('Could not unlock the note lock session:', error);
			if (!mountedRef.current) return;
			// WebCrypto reports a wrong password as a generic OperationError. Other errors stay
			// out of the UI, e.g. the native crypto backends word theirs differently.
			setErrorMessage(error.name === 'OperationError' ? _('Invalid password') : _('Could not unlock. Please try again.'));
			setUnlocking(false);
		}
	}, [password, unlocking, props.onUnlocked]);

	const renderForm = () => {
		if (props.undecryptable) {
			return (
				<Text style={styles.message}>{_('This note could not be unlocked. If it was locked prior to a password reset, the content is no longer recoverable.')}</Text>
			);
		}

		if (!props.hasNoteLockKey) {
			return (
				<>
					<Text style={styles.message}>{_('Reading this note requires the note lock password, which has not been set up on this device yet.')}</Text>
					<View style={styles.buttonContainer}>
						<PrimaryButton onPress={onSetUp}>{_('Set up note lock')}</PrimaryButton>
					</View>
				</>
			);
		}

		return (
			<>
				<Text style={styles.message}>{_('This note is locked. Enter your password to unlock your notes for this session.')}</Text>
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
					<PrimaryButton onPress={onUnlock} disabled={!password || unlocking}>{_('Unlock')}</PrimaryButton>
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
