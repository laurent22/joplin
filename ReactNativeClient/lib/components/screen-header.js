import React, { Component } from 'react';
import { connect } from 'react-redux'
import { View, Text, Button, StyleSheet, TouchableOpacity, Picker } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Log } from 'lib/log.js';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { _ } from 'lib/locale.js';
import { Setting } from 'lib/models/setting.js';
import { FileApi } from 'lib/file-api.js';
import { FileApiDriverOneDrive } from 'lib/file-api-driver-onedrive.js';
import { reg } from 'lib/registry.js'
import { globalStyle } from 'lib/components/global-style.js';

let styleObject = {
	container: {
		flexDirection: 'row',
		paddingTop: 10,
		paddingBottom: 10,
		backgroundColor: globalStyle.backgroundColor,
		alignItems: 'center',
		shadowColor: '#000000',
		elevation: 5,
	},
	folderPicker: {
		height: 30,
		flex:1,
		color: globalStyle.color,
		backgroundColor: globalStyle.backgroundColor,
	},
	divider: {
		borderBottomWidth: 1,
		borderColor: globalStyle.dividerColor,
		backgroundColor: "#0000ff"
	},
	sideMenuButton: {
		flex: 1,
		backgroundColor: globalStyle.backgroundColor,
		paddingLeft: globalStyle.marginLeft,
		paddingRight: 5,
		marginRight: 2,
	},
	sideMenuButtonText: {
		textAlignVertical: 'center',
		color: globalStyle.color,
		fontWeight: 'bold',
		flex: 1,
	},
	backButton: {
		flex: 1,
		backgroundColor: globalStyle.backgroundColor,
		paddingLeft: 15,
		paddingRight: 15,
		marginRight: 1,
	},
	backButtonIcon: {
		flex: 1,
		fontSize: 20,
		color: globalStyle.color,
		textAlignVertical: 'center',
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
	contextMenuTrigger: {
		fontSize: 25,
		paddingRight: globalStyle.marginRight,
		color: globalStyle.color,
	},
	contextMenu: {
		backgroundColor: globalStyle.backgroundColor,
	},
	contextMenuItem: {
		backgroundColor: globalStyle.backgroundColor,
	},
	contextMenuItemText: {
		flex: 1,
		height: 40,
		textAlignVertical: 'center',
		paddingLeft: globalStyle.marginLeft,
		paddingRight: globalStyle.marginRight,
		color: globalStyle.color,
		backgroundColor: globalStyle.backgroundColor,
	},
	titleText: {
		flex: 1,
		marginLeft: 0,
		color: globalStyle.color,
	}
};

styleObject.backButtonDisabled = Object.assign({}, styleObject.backButton, { opacity: 0.2 });
styleObject.saveButtonDisabled = Object.assign({}, styleObject.saveButton, { opacity: 0.2 });

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
			// <Text style={styles.backButtonText}>&lt;</Text>
			return (
				<TouchableOpacity onPress={onPress} disabled={disabled}>
					<View style={disabled ? styles.backButtonDisabled : styles.backButton}>
						<Icon name='md-arrow-back' style={styles.backButtonIcon} />
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
				<MenuOption value={o.onPress} key={'menuOption_' + key++} style={styles.contextMenuItem}>
					<Text style={styles.contextMenuItemText}>{o.title}</Text>
				</MenuOption>);
		}

		if (menuOptionComponents.length) {
			menuOptionComponents.push(<View key={'menuOption_' + key++} style={styles.divider}/>);
		}

		menuOptionComponents.push(
			<MenuOption value={() => this.log_press()} key={'menuOption_' + key++} style={styles.contextMenuItem}>
				<Text style={styles.contextMenuItemText}>{_('Log')}</Text>
			</MenuOption>);

		menuOptionComponents.push(
			<MenuOption value={() => this.status_press()} key={'menuOption_' + key++} style={styles.contextMenuItem}>
				<Text style={styles.contextMenuItemText}>{_('Status')}</Text>
			</MenuOption>);

		const createTitleComponent = () => {
			const p = this.props.titlePicker;
			if (p) {
				let items = [];
				for (let i = 0; i < p.items.length; i++) {
					let item = p.items[i];
					items.push(<Picker.Item label={item.label} value={item.value} key={item.value}/>);
				}
				return (
					<Picker style={styles.folderPicker} selectedValue={p.selectedValue} onValueChange={(itemValue, itemIndex) => { if (p.onValueChange) p.onValueChange(itemValue, itemIndex); }}>
						{ items }
					</Picker>
				);
			} else {
				let title = 'title' in this.props && this.props.title !== null ? this.props.title : _(this.props.navState.routeName);
				return <Text style={styles.titleText}>{title}</Text>
			}
		}

		const titleComp = createTitleComponent();

		return (
			<View style={styles.container} >
				{ sideMenuButton(styles, () => this.sideMenuButton_press()) }
				{ backButton(styles, () => this.backButton_press(), !this.props.historyCanGoBack) }
				{ saveButton(styles, () => { if (this.props.onSaveButtonPress) this.props.onSaveButtonPress() }, this.props.saveButtonDisabled === true, this.props.showSaveButton === true) }
				{ titleComp }				
			    <Menu onSelect={(value) => this.menu_select(value)} style={styles.contextMenu}>
					<MenuTrigger>
						<Text style={styles.contextMenuTrigger}>      &#8942;</Text>
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