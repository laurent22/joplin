import * as React from 'react';

import { View, Button, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AppState } from '../../utils/types';
const { connect } = require('react-redux');
import { ScreenHeader } from '../ScreenHeader';
import { _ } from '@joplin/lib/locale';
const { BaseScreenComponent } = require('../base-screen');
const Shared = require('@joplin/lib/components/shared/dropbox-login-shared');
import shim, { MessageBoxType } from '@joplin/lib/shim';
import { themeStyle } from '../global-style';

class DropboxLoginScreenComponent extends BaseScreenComponent {
	public constructor() {
		super();

		this.styles_ = {};

		this.shared_ = new Shared(
			this,
			(msg: string) => shim.showMessageBox(msg, { type: MessageBoxType.Info }),
			(msg: string) => shim.showErrorDialog(msg),
		);
	}

	public UNSAFE_componentWillMount() {
		this.shared_.refreshUrl();
	}

	private styles() {
		const themeId = this.props.themeId;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		const styles = {
			screen: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
			container: {
				padding: theme.margin,
				backgroundColor: theme.backgroundColor,
			},
			stepText: { ...theme.normalText, marginBottom: theme.margin },
			urlText: { ...theme.urlText, marginBottom: theme.margin },
		};

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	public render() {
		const theme = themeStyle(this.props.themeId);

		return (
			<View style={this.styles().screen}>
				<ScreenHeader title={_('Login with Dropbox')} />

				<ScrollView style={this.styles().container}>
					<Text style={this.styles().stepText}>{_('To allow Joplin to synchronise with Dropbox, please follow the steps below:')}</Text>
					<Text style={this.styles().stepText}>{_('Step 1: Open this URL in your browser to authorise the application:')}</Text>
					<View>
						<TouchableOpacity onPress={this.shared_.loginUrl_click}>
							<Text style={this.styles().urlText}>{this.state.loginUrl}</Text>
						</TouchableOpacity>
					</View>
					<Text style={this.styles().stepText}>{_('Step 2: Enter the code provided by Dropbox:')}</Text>
					<TextInput placeholder={_('Enter code here')} placeholderTextColor={theme.colorFaded} selectionColor={theme.textSelectionColor} keyboardAppearance={theme.keyboardAppearance} value={this.state.authCode} onChangeText={this.shared_.authCodeInput_change} style={theme.lineInput} />
					<View style={{ height: 10 }}></View>
					<Button disabled={this.state.checkingAuthToken} title={_('Submit')} onPress={this.shared_.submit_click}></Button>

					{/* Add this extra padding to make sure the view is scrollable when the keyboard is visible on small screens (iPhone SE) */}
					<View style={{ height: 200 }}></View>
				</ScrollView>
			</View>
		);
	}
}

const DropboxLoginScreen = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(DropboxLoginScreenComponent);

export default DropboxLoginScreen;
