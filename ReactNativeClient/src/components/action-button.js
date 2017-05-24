import React, { Component } from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ReactNativeActionButton from 'react-native-action-button';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'

const styles = StyleSheet.create({
	actionButtonIcon: {
		fontSize: 20,
		height: 22,
		color: 'white',
	},
});

class ActionButtonComponent extends React.Component {

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
		return (
			<ReactNativeActionButton buttonColor="rgba(231,76,60,1)">

				<ReactNativeActionButton.Item buttonColor='#9b59b6' title="New todo" onPress={() => { this.newTodo_press() }}>
					<Icon name="md-checkbox-outline" style={styles.actionButtonIcon} />
				</ReactNativeActionButton.Item>

				<ReactNativeActionButton.Item buttonColor='#9b59b6' title="New note" onPress={() => { this.newNote_press() }}>
					<Icon name="md-document" style={styles.actionButtonIcon} />
				</ReactNativeActionButton.Item>

				<ReactNativeActionButton.Item buttonColor='#3498db' title="New folder" onPress={() => { this.newFolder_press() }}>
					<Icon name="md-folder" style={styles.actionButtonIcon} />
				</ReactNativeActionButton.Item>

			</ReactNativeActionButton>
		);
	}
}

const ActionButton = connect(
	(state) => {
		return {};
	}
)(ActionButtonComponent)

export { ActionButton };