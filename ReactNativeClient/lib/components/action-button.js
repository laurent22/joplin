import React, { Component } from 'react';
import { StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ReactNativeActionButton from 'react-native-action-button';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { _ } from 'lib/locale.js'

const styles = StyleSheet.create({
	actionButtonIcon: {
		fontSize: 20,
		height: 22,
		color: 'white',
	},
});

class ActionButtonComponent extends React.Component {

	constructor() {
		super();
		this.state = {
			toggled: false,
		};
	}

	newTodo_press() {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Note',
			noteId: null,
			folderId: this.props.parentFolderId,
			itemType: 'todo',
		});
	}

	newNote_press() {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Note',
			noteId: null,
			folderId: this.props.parentFolderId,
			itemType: 'note',
		});
	}

	newFolder_press() {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Folder',
			folderId: null,
		});
	}

	render() {
		let buttons = this.props.buttons ? this.props.buttons : [];

		if (this.props.addFolderNoteButtons) {
			if (this.props.folders.length) {
				buttons.push({
					title: _('New todo'),
					onPress: () => { this.newTodo_press() },
					color: '#9b59b6',
					icon: 'md-checkbox-outline',
				});

				buttons.push({
					title: _('New note'),
					onPress: () => { this.newNote_press() },
					color: '#9b59b6',
					icon: 'md-document',
				});
			}

			buttons.push({
				title: _('New folder'),
				onPress: () => { this.newFolder_press() },
				color: '#3498db',
				icon: 'md-folder',
			});
		}

		let buttonComps = [];
		for (let i = 0; i < buttons.length; i++) {
			let button = buttons[i];
			let buttonTitle = button.title ? button.title : '';
			let key = buttonTitle.replace(/\s/g, '_') + '_' + button.icon;
			buttonComps.push(
				<ReactNativeActionButton.Item key={key} buttonColor={button.color} title={buttonTitle} onPress={button.onPress}>
					<Icon name={button.icon} style={styles.actionButtonIcon} />
				</ReactNativeActionButton.Item>
			);
		}

		if (!buttonComps.length && !this.props.mainButton) {
			return <ReactNativeActionButton style={{ display: 'none' }}/>
		}

		let mainButton = this.props.mainButton ? this.props.mainButton : {};
		let mainIcon = mainButton.icon ? <Icon name={mainButton.icon} style={styles.actionButtonIcon} /> : <Text style={{fontSize: 20, color:"#ffffff"}}>+</Text>;

		if (this.props.isToggle) {
			if (!this.props.buttons || this.props.buttons.length != 2) throw new Error('Toggle state requires two buttons');
			let button = this.props.buttons[this.state.toggled ? 1 : 0];
			let mainIcon = <Icon name={button.icon} style={styles.actionButtonIcon} />
			return (
				<ReactNativeActionButton
					icon={mainIcon}
					buttonColor="rgba(231,76,60,1)"
					onPress={() => {
						let doToggle = button.onPress(this.state.toggled);
						if (doToggle !== false) this.setState({ toggled: !this.state.toggled });
					}}
				/>
			);
		} else {
			return (
				<ReactNativeActionButton icon={mainIcon} buttonColor="rgba(231,76,60,1)" onPress={ function() { } }>
					{ buttonComps }
				</ReactNativeActionButton>
			);
		}
	}
}

const ActionButton = connect(
	(state) => {
		return {
			folders: state.folders,
		};
	}
)(ActionButtonComponent)

export { ActionButton };