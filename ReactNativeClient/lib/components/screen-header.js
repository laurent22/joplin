import React, { Component } from 'react';
import { connect } from 'react-redux'
import { View, Text, Button, StyleSheet } from 'react-native';
import { Log } from 'lib/log.js';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { _ } from 'lib/locale.js';
import { Setting } from 'lib/models/setting.js';
import { FileApi } from 'lib/file-api.js';
import { FileApiDriverOneDrive } from 'lib/file-api-driver-onedrive.js';
import { reg } from 'lib/registry.js'

const styles = StyleSheet.create({
	divider: {
		marginVertical: 5,
		marginHorizontal: 2,
		borderBottomWidth: 1,
		borderColor: '#ccc'
	},
});

class ScreenHeaderComponent extends Component {

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

	log_press() {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Log',
		});	
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
			<MenuOption value={() => this.log_press()} key={'menuOption_' + key++}>
				<Text>{_('Log')}</Text>
			</MenuOption>);

		let title = 'title' in this.props && this.props.title !== null ? this.props.title : _(this.props.navState.routeName);

		console.info('CAN', this.props.historyCanGoBack);

		return (
			<View style={{ flexDirection: 'row', padding: 10, backgroundColor: '#ffffff', alignItems: 'center' }} >
				<Button title="☰" onPress={() => this.sideMenuButton_press()} />
				<Button disabled={!this.props.historyCanGoBack} title="<" onPress={() => this.backButton_press()}></Button>
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
		console.info('CONNECT', state.historyCanGoBack);	
		return {
			historyCanGoBack: state.historyCanGoBack,
		};
	}
)(ScreenHeaderComponent)

export { ScreenHeader };