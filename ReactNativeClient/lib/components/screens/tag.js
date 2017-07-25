import React, { Component } from 'react';
import { ListView, StyleSheet, View, TextInput, FlatList, TouchableHighlight } from 'react-native';
import { connect } from 'react-redux'
import { ScreenHeader } from 'lib/components/screen-header.js';
import Icon from 'react-native-vector-icons/Ionicons';
import { _ } from 'lib/locale.js';
import { Note } from 'lib/models/note.js';
import { NoteItem } from 'lib/components/note-item.js';
import { BaseScreenComponent } from 'lib/components/base-screen.js';
import { globalStyle } from 'lib/components/global-style.js';

let styles = {
	body: {
		flex: 1,
	},
}

class TagScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	componentDidMount() {
		this.refreshNotes();
	}

	componentWillReceiveProps(newProps) {
		if (newProps.selectedTagId !== this.props.selectedTagId) {
			this.refreshNotes(newProps);
		}
	}

	async refreshNotes(props = null) {
		if (props === null) props = this.props;

		const source = JSON.stringify({ selectedTagId: props.selectedTagId });
		if (source == props.tagNotesSource) return;

		const notes = await Tag.notes(props.selectedTagId);

		this.props.dispatch({
			type: 'NOTES_UPDATE_ALL',
			notes: notes,
			notesSource: source,
		});
	}

	render() {
		let title = tag ? tag.title : '';

		// <ActionButton addFolderNoteButtons={true} parentFolderId={this.props.selectedFolderId}></ActionButton>

		const { navigate } = this.props.navigation;
		return (
			<View style={this.styles().screen}>
				<ScreenHeader title={title} menuOptions={this.menuOptions()} />
				<NoteList style={{flex: 1}}/>
				<DialogBox ref={dialogbox => { this.dialogbox = dialogbox }}/>
			</View>
		);
	}

}

const TagScreen = connect(
	(state) => {
		return {
			tag: tag,
			notes: state.notes,
			notesSource: state.notesSource,
		};
	}
)(TagScreenComponent)

export { TagScreen };