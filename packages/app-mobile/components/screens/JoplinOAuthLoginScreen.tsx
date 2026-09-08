import * as React from 'react';

import { View, Text, StyleSheet, Linking, Animated, Easing } from 'react-native';
import { connect } from 'react-redux';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '../global-style';
import { AppState } from '../../utils/types';
import { generateApplicationConfirmUrl, reducer, checkIfLoginWasSuccessful, saveApplicationAuthId, defaultState, assertIsJoplinOAuthSyncTarget, fetchLoginUrl, normalizeBaseUrl } from '@joplin/lib/services/joplinCloudUtils';
import { uuidgen } from '@joplin/lib/uuid';
import { Button } from 'react-native-paper';
import createRootStyle from '../../utils/createRootStyle';
import ScreenHeader from '../ScreenHeader';
import Clipboard from '@react-native-clipboard/clipboard';
import Logger from '@joplin/utils/Logger';
import { reg } from '@joplin/lib/registry';
import Icon from '../Icon';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';

const logger = Logger.create('JoplinCloudLoginScreen');

interface Props {
	themeId: number;
	syncTargetId: number;
	syncTargetApi: string;
}
const syncIconRotationValue = new Animated.Value(0);

const syncIconRotation = syncIconRotationValue.interpolate({
	inputRange: [0, 1],
	outputRange: ['0deg', '360deg'],
});

let syncIconAnimation: Animated.CompositeAnimation;

const useStyle = (themeId: number) => {
	return React.useMemo(() => {
		const theme = themeStyle(themeId);

		return StyleSheet.create({
			...createRootStyle(themeId),
			buttonsContainer: {
				display: 'flex',
				marginVertical: theme.fontSize * 1.5,
			},
			containerStyle: {
				padding: theme.margin,
				backgroundColor: theme.backgroundColor,
				flex: 1,
			},
			text: {
				color: theme.color,
				fontSize: theme.fontSize,
			},
			smallTextStyle: {
				color: theme.color,
				fontSize: theme.fontSize * 0.8,
				paddingBottom: theme.fontSize * 1.2,
				textAlign: 'center',
			},
			bold: {
				...theme.normalText,
				fontSize: 18,
				fontWeight: 'bold',
			},
			loadingIcon: {
				color: theme.color,
				marginVertical: theme.fontSize * 1.2,
				fontSize: 38,
				textAlign: 'center',
			},
		});
	}, [themeId]);
};

const JoplinOAuthScreenComponent = (props: Props) => {

	const confirmUrl = async (applicationAuthId: string) => {
		const baseUrl = await fetchLoginUrl(props.syncTargetId, props.syncTargetApi);
		return `${baseUrl}/applications/${applicationAuthId}/confirm`;
	};
	const applicationAuthUrl = (applicationAuthId: string) => `${props.syncTargetApi}/api/application_auth/${applicationAuthId}`;

	const syncTargetName = SyncTargetRegistry.infoById(props.syncTargetId).label;
	const [intervalIdentifier, setIntervalIdentifier] = React.useState(undefined);
	const [state, dispatch] = React.useReducer(reducer, defaultState(syncTargetName));

	const applicationAuthId = React.useMemo(() => uuidgen(), []);

	const styles = useStyle(props.themeId);

	const periodicallyCheckForCredentials = () => {
		if (intervalIdentifier) return;

		const interval = setInterval(async () => {
			try {
				assertIsJoplinOAuthSyncTarget(props.syncTargetId);
				const response = await checkIfLoginWasSuccessful(applicationAuthUrl(applicationAuthId), props.syncTargetId);
				if (response && response.success) {
					dispatch({ type: 'COMPLETED' });
					clearInterval(interval);
					void reg.scheduleSync(0);
				}
			} catch (error) {
				logger.error(error);
				dispatch({ type: 'ERROR', payload: error.message });
				clearInterval(interval);
			}
		}, 2 * 1000);

		setIntervalIdentifier(interval);
	};

	const onButtonUsed = async () => {
		if (state.next === 'LINK_USED') {
			dispatch({ type: 'LINK_USED' });
		}
		try {
			assertIsJoplinOAuthSyncTarget(props.syncTargetId);
			await saveApplicationAuthId(applicationAuthId, props.syncTargetId);
			periodicallyCheckForCredentials();
		} catch (error) {
			dispatch({
				type: 'ERROR',
				payload: String(error),
			});
		}
	};

	const onAuthoriseClicked = async () => {
		try {
			const url = await generateApplicationConfirmUrl(await confirmUrl(applicationAuthId));
			await onButtonUsed();
			await Linking.openURL(url);
		} catch (error) {
			dispatch({
				type: 'ERROR',
				payload: String(error),
			});
		}
	};

	const onCopyToClipboardClicked = async () => {
		try {
			const url = await generateApplicationConfirmUrl(await confirmUrl(applicationAuthId));
			await onButtonUsed();
			Clipboard.setString(url);
		} catch (error) {
			dispatch({
				type: 'ERROR',
				payload: String(error),
			});
		}
	};

	React.useEffect(() => {
		return () => {
			clearInterval(intervalIdentifier);
		};
	}, [intervalIdentifier]);

	React.useEffect(() => {
		if (intervalIdentifier && state.next === 'COMPLETED') {
			syncIconAnimation = Animated.loop(
				Animated.timing(syncIconRotationValue, {
					toValue: 1,
					duration: 1800,
					easing: Easing.linear,
					useNativeDriver: false,
				}),
			);

			syncIconAnimation.start();
		}
	}, [intervalIdentifier, state]);

	return (
		<View style={styles.root}>
			<ScreenHeader title={_('%s Login', syncTargetName)} />
			<View style={styles.containerStyle}>
				{ state.active !== 'COMPLETED' ?
					<React.Fragment>
						<Text style={styles.text}>
							{_('To allow Joplin to synchronise with %s, please log in using this URL:', syncTargetName)}
						</Text>
						<View style={styles.buttonsContainer}>
							<View style={{ marginBottom: 20 }}>
								<Button
									onPress={onAuthoriseClicked}
									icon='open-in-new'
									mode='contained'
								>
									{_('Authorise')}
								</Button>
							</View>
							<Button
								onPress={onCopyToClipboardClicked}
								icon='content-copy'
								mode='outlined'
							>{_('Copy link to website')}
							</Button>
						</View>
					</React.Fragment>
					: null
				}
				<Text style={styles[state.className]}>{state.message()}
					{state.active === 'ERROR' ? (
						<Text style={styles[state.className]}>{state.errorMessage}</Text>
					) : null}
				</Text>
				{state.active === 'LINK_USED' ? (
					<Animated.View style={{ transform: [{ rotate: syncIconRotation }] }}>
						<Icon name='ionicon sync' style={styles.loadingIcon} accessibilityLabel={_('Waiting for authorisation...')}/>
					</Animated.View>
				) : null }
			</View>
		</View>
	);
};

type OwnProps = {
	syncTargetId: number;
};

const JoplinOAuthLoginScreen = connect((state: AppState, { syncTargetId }: OwnProps) => {
	const apiBaseUrl = (state.settings[`sync.${syncTargetId}.path`] ?? '') as string;
	return {
		themeId: state.settings.theme,
		syncTargetApi: normalizeBaseUrl(apiBaseUrl),
		syncTargetId,
	};
})(JoplinOAuthScreenComponent);

export default JoplinOAuthLoginScreen;

