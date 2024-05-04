import * as React from 'react';

import { View, Text, StyleSheet, Linking, Animated, Easing } from 'react-native';
const { connect } = require('react-redux');
const { _ } = require('@joplin/lib/locale');
const { themeStyle } = require('../global-style.js');
import { AppState } from '../../utils/types';
import { generateApplicationConfirmUrl, reducer, checkIfLoginWasSuccessful, defaultState } from '@joplin/lib/services/joplinCloudUtils';
import { uuidgen } from '@joplin/lib/uuid';
import { Button } from 'react-native-paper';
import createRootStyle from '../../utils/createRootStyle';
import ScreenHeader from '../ScreenHeader';
import Clipboard from '@react-native-clipboard/clipboard';
const Icon = require('react-native-vector-icons/Ionicons').default;
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('JoplinCloudLoginScreen');

interface Props {
	themeId: number;
	joplinCloudWebsite: string;
	joplinCloudApi: string;
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
				marginVertical: theme.fontSize * 1.2,
				fontSize: 38,
				textAlign: 'center',
			},
		});
	}, [themeId]);
};

const JoplinCloudScreenComponent = (props: Props) => {

	const confirmUrl = (applicationAuthId: string) => `${props.joplinCloudWebsite}/applications/${applicationAuthId}/confirm`;
	const applicationAuthUrl = (applicationAuthId: string) => `${props.joplinCloudApi}/api/application_auth/${applicationAuthId}`;

	const [intervalIdentifier, setIntervalIdentifier] = React.useState(undefined);
	const [state, dispatch] = React.useReducer(reducer, defaultState);

	const applicationAuthId = React.useMemo(() => uuidgen(), []);

	const styles = useStyle(props.themeId);

	const periodicallyCheckForCredentials = () => {
		if (intervalIdentifier) return;

		const interval = setInterval(async () => {
			try {
				const response = await checkIfLoginWasSuccessful(applicationAuthUrl(applicationAuthId));
				if (response && response.success) {
					dispatch({ type: 'COMPLETED' });
					clearInterval(interval);
				}
			} catch (error) {
				logger.error(error);
				dispatch({ type: 'ERROR', payload: error.message });
				clearInterval(interval);
			}
		}, 2 * 1000);

		setIntervalIdentifier(interval);
	};

	const onButtonUsed = () => {
		if (state.next === 'LINK_USED') {
			dispatch({ type: 'LINK_USED' });
		}
		periodicallyCheckForCredentials();
	};

	const onAuthoriseClicked = async () => {
		const url = await generateApplicationConfirmUrl(confirmUrl(applicationAuthId));
		await Linking.openURL(url);
		onButtonUsed();
	};

	const onCopyToClipboardClicked = async () => {
		const url = await generateApplicationConfirmUrl(confirmUrl(applicationAuthId));
		Clipboard.setString(url);
		onButtonUsed();
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
			<ScreenHeader title={_('Joplin Cloud Login')} />
			<View style={styles.containerStyle}>
				<Text style={styles.text}>
					{_('To allow Joplin to synchronise with Joplin Cloud, please login using this URL:')}
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
					<Text style={styles.smallTextStyle}>Or</Text>
					<Button
						onPress={onCopyToClipboardClicked}
						icon='content-copy'
						mode='outlined'
					>{_('Copy link to website')}
					</Button>

				</View>
				<Text style={styles[state.className]}>{state.message()}
					{state.active === 'ERROR' ? (
						<Text style={styles[state.className]}>{state.errorMessage}</Text>
					) : null}
				</Text>
				{state.active === 'LINK_USED' ? (
					<Animated.View style={{ transform: [{ rotate: syncIconRotation }] }}>
						<Icon name='sync' style={styles.loadingIcon}/>
					</Animated.View>
				) : null }
			</View>
		</View>
	);
};

const JoplinCloudLoginScreen = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
		joplinCloudWebsite: state.settings['sync.10.website'],
		joplinCloudApi: state.settings['sync.10.path'],
	};
})(JoplinCloudScreenComponent);

export default JoplinCloudLoginScreen;

