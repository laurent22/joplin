import React, { Component } from 'react';
import { connect } from 'react-redux'
import { View, Text, Button, StyleSheet } from 'react-native';
import { Log } from 'lib/log.js';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { _ } from 'lib/locale.js';
import { Setting } from 'lib/models/setting.js';
import { FileApi } from 'lib/file-api.js';
import { FileApiDriverOneDrive } from 'lib/file-api-driver-onedrive.js';

const styles = StyleSheet.create({
	divider: {
		marginVertical: 5,
		marginHorizontal: 2,
		borderBottomWidth: 1,
		borderColor: '#ccc'
	},
});

class ScreenHeaderComponent extends Component {

	showBackButton() {
		// Note: this is hardcoded for now because navigation.state doesn't tell whether
		// it's possible to go back or not. Maybe it's possible to get this information
		// from somewhere else.
		return this.props.navState.routeName != 'Notes';
	}

	sideMenuButton_press() {
		this.props.dispatch({ type: 'SIDE_MENU_TOGGLE' });
	}

	backButton_press() {
		this.props.dispatch({ type: 'Navigation/BACK' });
	}

	menu_select(value) {
		if (typeof(value) == 'function') {
			value();
		}
	}

	menu_synchronize() {
		// const CLIENT_ID = 'e09fc0de-c958-424f-83a2-e56a721d331b';
		// const CLIENT_SECRET = 'JA3cwsqSGHFtjMwd5XoF5L5';

		// let driver = new FileApiDriverOneDrive(CLIENT_ID, CLIENT_SECRET);
		// let auth = Setting.value('sync.onedrive.auth');
		
		// if (auth) {
		// 	auth = JSON.parse(auth);
		// } else {
		// 	driver.api().oauthDance(vorpal);
		// 	//auth = driver.api().oauthDance(vorpal);
		// 	//Setting.setValue('sync.onedrive.auth', JSON.stringify(auth));
		// }
	}

	render() {
		let key = 0;
		let menuOptionComponents = [];
		for (let i = 0; i < this.props.menuOptions.length; i++) {
			let o = this.props.menuOptions[i];
			menuOptionComponents.push(
				<MenuOption value={o.onPress} key={'menuOption_' + key++}>
					<Text>{o.title}</Text>
				</MenuOption>);
		}

		if (menuOptionComponents.length) {
			menuOptionComponents.push(<View key={'menuOption_' + key++} style={styles.divider}/>);
		}

		menuOptionComponents.push(
			<MenuOption value={() => this.menu_synchronize()} key={'menuOption_' + key++}>
				<Text>{_('Synchronize')}</Text>
			</MenuOption>);

		menuOptionComponents.push(
			<MenuOption value={1} key={'menuOption_' + key++}>
				<Text>{_('Configuration')}</Text>
			</MenuOption>);

		let title = 'title' in this.props && this.props.title !== null ? this.props.title : _(this.props.navState.routeName);

		return (
			<View style={{ flexDirection: 'row', padding: 10, backgroundColor: '#ffffff', alignItems: 'center' }} >
				<Button title="☰" onPress={() => this.sideMenuButton_press()} />
				<Button disabled={!this.showBackButton()} title="<" onPress={() => this.backButton_press()}></Button>
				<Text style={{ flex:1, marginLeft: 10 }} >{title}</Text>
			    <Menu onSelect={(value) => this.menu_select(value)}>
					<MenuTrigger>
						<Text style={{ fontSize: 20 }}>   &#8942; </Text>
					</MenuTrigger>
					<MenuOptions>
						{ menuOptionComponents }
					</MenuOptions>
				</Menu>
			</View>
		);
	}

}

ScreenHeaderComponent.defaultProps = {
	menuOptions: [],
};

const ScreenHeader = connect(
	(state) => {
		return { user: state.user };
	}
)(ScreenHeaderComponent)

export { ScreenHeader };