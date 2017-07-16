import React, { Component } from 'react';
import { connect } from 'react-redux'
import { View, Text, Button, StyleSheet, TouchableOpacity, Picker } from 'react-native';
import { Log } from 'lib/log.js';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { _ } from 'lib/locale.js';
import { Setting } from 'lib/models/setting.js';
import { FileApi } from 'lib/file-api.js';
import { FileApiDriverOneDrive } from 'lib/file-api-driver-onedrive.js';
import { reg } from 'lib/registry.js'

let styleObject = {
	divider: {
		marginVertical: 5,
		marginHorizontal: 2,
		borderBottomWidth: 1,
		borderColor: '#ccc'
	},
	sideMenuButton: {
		flex: 1,
		backgroundColor: "#0482E3",
		paddingLeft: 15,
		paddingRight: 15,
		marginRight: 10,
	},
	sideMenuButtonText: {
		textAlignVertical: 'center',
		color: "#ffffff",
		fontWeight: 'bold',
		flex: 1,
	},
	backButton: {
		flex: 1,
		backgroundColor: "#0482E3",
		paddingLeft: 15,
		paddingRight: 15,
		marginRight: 10,
	},
	backButtonText: {
		textAlignVertical: 'center',
		color: "#ffffff",
		fontWeight: 'bold',
		flex: 1,
	},
	saveButton: {
		flex: 1,
		backgroundColor: "#0482E3",
		paddingLeft: 15,
		paddingRight: 15,
		marginRight: 10,
	},
	saveButtonText: {
		textAlignVertical: 'center',
		color: "#ffffff",
		fontWeight: 'bold',
		flex: 1,
	},
};

styleObject.backButtonDisabled = Object.assign({}, styleObject.backButton, { backgroundColor: "#c6c6c6" });
styleObject.saveButtonDisabled = Object.assign({}, styleObject.saveButton, { backgroundColor: "#c6c6c6" });

const styles = StyleSheet.create(styleObject);

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

	status_press() {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Status',
		});	
	}

	render() {

		function sideMenuButton(styles, onPress) {
			return (
				<TouchableOpacity onPress={onPress}>
					<View style={styles.sideMenuButton}>
						<Text style={styles.sideMenuButtonText}>☰</Text>
					</View>
				</TouchableOpacity>
			);
		}

		function backButton(styles, onPress, disabled) {
			return (
				<TouchableOpacity onPress={onPress} disabled={disabled}>
					<View style={disabled ? styles.backButtonDisabled : styles.backButton}>
						<Text style={styles.backButtonText}>&lt;</Text>
					</View>
				</TouchableOpacity>
			);
		}

		function saveButton(styles, onPress, disabled, show) {
			if (!show) return null;

			return (
				<TouchableOpacity onPress={onPress} disabled={disabled}>
					<View style={disabled ? styles.saveButtonDisabled : styles.saveButton}>
						<Text style={styles.saveButtonText}>Save</Text>
					</View>
				</TouchableOpacity>
			);
		}

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

		menuOptionComponents.push(
			<MenuOption value={() => this.status_press()} key={'menuOption_' + key++}>
				<Text>{_('Status')}</Text>
			</MenuOption>);

		const createTitleComponent = () => {
			const p = this.props.titlePicker;
			if (p) {
				let items = [];
				for (let i = 0; i < p.items.length; i++) {
					let item = p.items[i];
					items.push(<Picker.Item label={item.label} value={item.value} key={item.value} />);
				}
				return (
					<Picker style={{height: 30, flex:1}} selectedValue={p.selectedValue} onValueChange={(itemValue, itemIndex) => { if (p.onValueChange) p.onValueChange(itemValue, itemIndex); }}>
						{ items }
					</Picker>
				);
			} else {
				let title = 'title' in this.props && this.props.title !== null ? this.props.title : _(this.props.navState.routeName);
				return <Text style={{ flex:1, marginLeft: 10 }}>{title}</Text>
			}
		}

		const titleComp = createTitleComponent();

		return (
			<View style={{ flexDirection: 'row', paddingLeft: 10, paddingTop: 10, paddingBottom: 10, paddingRight: 0, backgroundColor: '#ffffff', alignItems: 'center' }} >
				{ sideMenuButton(styles, () => this.sideMenuButton_press()) }
				{ backButton(styles, () => this.backButton_press(), !this.props.historyCanGoBack) }
				{ saveButton(styles, () => { if (this.props.onSaveButtonPress) this.props.onSaveButtonPress() }, this.props.saveButtonDisabled === true, this.props.showSaveButton === true) }
				{ titleComp }				
			    <Menu onSelect={(value) => this.menu_select(value)}>
					<MenuTrigger>
						<Text style={{ fontSize: 25 }}>      &#8942;  </Text>
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
		return {
			historyCanGoBack: state.historyCanGoBack,
		};
	}
)(ScreenHeaderComponent)

export { ScreenHeader };