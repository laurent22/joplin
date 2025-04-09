import SsoScreenShared from '@joplin/lib/components/shared/SsoScreenShared';
import { connect } from 'react-redux';
import { AppState } from '../../utils/types';
import { StyleSheet, View, Text } from 'react-native';
import * as React from 'react';
import { themeStyle } from '@joplin/lib/theme';
import createRootStyle from '../../utils/createRootStyle';
import ScreenHeader from '../ScreenHeader';
import { _ } from '@joplin/lib/locale';
import { Button, TextInput } from 'react-native-paper';
import shim from '@joplin/lib/shim';
import BackButtonService from '../../services/BackButtonService';

interface Props {
	themeId: number;
	shared: SsoScreenShared;
}

const SsoLoginScreenComponent = (props: Props) => {
	const theme = themeStyle(props.themeId);

	const styles = StyleSheet.create({
		...createRootStyle(props.themeId),
		buttonContainer: {
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: theme.margin,
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
		marginBottom: {
			marginBottom: theme.margin,
		},
	});

	const [code, setCode] = React.useState('');

	const submit = async () => {
		if (await props.shared.processLoginCode(code)) {
			await shim.showMessageBox(_('You are now logged into your account.'), {
				buttons: [_('OK')],
			});

			await BackButtonService.back();
		} else {
			await shim.showErrorDialog(_('Failed to connect to your account. Please try again.'));
		}
	};

	return (
		<View style={styles.root}>
			<ScreenHeader title={_('Joplin Server Login')} />
			<View style={styles.containerStyle}>
				<React.Fragment>
					<Text style={{ ...styles.text, ...styles.buttonContainer }}>
						{_('To allow Joplin to synchronise with your account, please follow these steps:')}
					</Text>

					<View style={styles.buttonContainer}>
						<Text style={styles.text}>1. </Text>
						<Button onPress={props.shared.openLoginPage} mode='contained'>{_('Log in with your web browser')}</Button>
					</View>

					<View style={styles.marginBottom}>
						<Text style={styles.text}>2. {_('Enter the code')}</Text>
						<TextInput placeholder='###-###-###' value={code} onChangeText={setCode}/>
					</View>

					<View style={styles.buttonContainer}>
						<Text style={styles.text}>3. </Text>
						<Button onPress={submit} disabled={!props.shared.isLoginCodeValid(code)} mode='contained'>{_('Continue')}</Button>
					</View>
				</React.Fragment>
			</View>
		</View>
	);
};

// Allows reuse of this screen for other code-based login flow
export default (shared: SsoScreenShared) => connect((state: AppState) => ({
	themeId: state.settings.theme,
}))((props: Props) => <SsoLoginScreenComponent {...props} shared={shared}/>);
