import * as React from 'react';

import Logger from '@joplin/utils/Logger';
import { View, Text, StyleSheet, Linking } from 'react-native';
const { connect } = require('react-redux');
const { _ } = require('@joplin/lib/locale');
const { themeStyle } = require('../global-style.js');
import { AppState } from '../../utils/types';
import { generateLoginWithUniqueLoginCode, reducer, intitialValues, checkIfLoginWasSuccessful } from '@joplin/lib/services/JoplinCloudLogin';
import { uuidgen } from '@joplin/lib/uuid';
import { Button } from 'react-native-paper';
import createRootStyle from '../../utils/createRootStyle';
import ScreenHeader from '../ScreenHeader';

interface Props {
	themeId: number;
	style: any;
}

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
			textStyle: {
				color: theme.color,
				fontSize: theme.fontSize,
			},
			smallTextStyle: {
				color: theme.color,
				fontSize: theme.fontSize * 0.8,
				paddingBottom: theme.fontSize * 1.2,
				textAlign: 'center',
			},
			h2Style: {
				...theme.normalText,
				fontSize: 18,
				fontWeight: 'bold',
			},
		});
	}, [themeId]);
};


const logger = Logger.create('JoplinCloudScreenComponent');

const JoplinCloudScreenComponent = (props: Props) => {

	const [uniqueLoginCode, setUniqueLoginCode] = React.useState(undefined);
	const [intervalIdentifier, setIntervalIdentifier] = React.useState(undefined);
	const [state, dispatch] = React.useReducer(reducer, intitialValues);

	const styles = useStyle(props.themeId);

	const periodicallyCheckForCredentials = () => {
		if (intervalIdentifier) return;

		const interval = setInterval(async () => {
			const response = await checkIfLoginWasSuccessful(uniqueLoginCode);
			if (response && response.success) {
				logger.info('completed!!');
				dispatch('COMPLETED');
				clearInterval(interval);
			}
		}, 5 * 1000);

		setIntervalIdentifier(interval);
	};

	const onButtonUsed = () => {
		if (state.next === 'LINK_USED') {
			dispatch('LINK_USED');
		}
		periodicallyCheckForCredentials();
	};

	const onAuthoriseClicked = async () => {
		const url = await generateLoginWithUniqueLoginCode(uniqueLoginCode);
		await Linking.openURL(url);
		onButtonUsed();
	};

	const onCopyToClipboardClicked = async () => {
		const url = await generateLoginWithUniqueLoginCode(uniqueLoginCode);
		// eslint-disable-next-line
		console.log({ url });
		onButtonUsed();
	};

	React.useEffect(() => {
		const ulc = uuidgen();
		setUniqueLoginCode(ulc);
	}, []);

	React.useEffect(() => {
		return () => {
			clearInterval(intervalIdentifier);
		};
	}, [intervalIdentifier]);

	return (
		<View style={styles.root}>
			<ScreenHeader title={_('Login with Joplin Cloud')} />
			<View style={styles.containerStyle}>
				<Text style={styles.textStyle}>
					{_('To allow Joplin to synchronise with Joplin Cloud, open this URL in your browser to authorise the application:')}
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
				<Text style={styles[state.style]}>{state.message}</Text>
				{state.active === 'LINK_USED' ? <Text>Carregando...</Text> : null}
			</View>
		</View>
	);
};

const JoplinCloudLoginScreen = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(JoplinCloudScreenComponent);

export default JoplinCloudLoginScreen;

