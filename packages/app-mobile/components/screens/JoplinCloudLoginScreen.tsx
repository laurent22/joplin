import * as React from 'react';

import Logger from '@joplin/utils/Logger';
import { View, Text, StyleSheet, Button, Linking } from 'react-native';
const { connect } = require('react-redux');
const { _ } = require('@joplin/lib/locale');
const { themeStyle } = require('../global-style.js');
import { AppState } from '../../utils/types';
import { generateLoginWithUniqueLoginCode, reducer, intitialValues, checkIfLoginWasSuccessful } from '@joplin/lib/services/JoplinCloudLogin';
import { uuidgen } from '@joplin/lib/uuid';

interface Props {
	themeId: string;
	style: any;
}

const styles = StyleSheet.create({
	page: { display: 'flex', flexDirection: 'column', height: '100%', marginTop: 300 },
	buttonsContainer: { display: 'flex' },
});


const logger = Logger.create('JoplinCloudScreenComponent');

const JoplinCloudScreenComponent = (props: Props) => {

	const theme = themeStyle(props.themeId);
	const [uniqueLoginCode, setUniqueLoginCode] = React.useState(undefined);
	const [intervalIdentifier, setIntervalIdentifier] = React.useState(undefined);
	const [state, dispatch] = React.useReducer(reducer, intitialValues);

	const containerStyle = { ...theme.containerStyle, padding: theme.configScreenPadding,
		flex: 1 };

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
		<View style={styles.page}>
			<View style={containerStyle}>
				<Text style={theme.textStyle}>
					{_('To allow Joplin to synchronise with Joplin Cloud, open this URL in your browser to authorise the application:')}
				</Text>
				<View style={styles.buttonsContainer}>
					<View style={{ marginBottom: 20 }}>
						<Button
							onPress={onAuthoriseClicked}
							title={_('Authorise')}
							// iconName='fa fa-external-link-alt'
							// level={ButtonLevel.Recommended}
						/>
					</View>
					<Button
						onPress={onCopyToClipboardClicked}
						title={_('Copy link to website')}
						// iconName='fa fa-clone'
						// level={ButtonLevel.Secondary}
					/>

				</View>
				<Text style={theme[state.style]}>{state.message}</Text>
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

