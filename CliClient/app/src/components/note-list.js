import React, { Component } from 'react';
import { connect } from 'react-redux'
import { ListView, Text, TouchableHighlight } from 'react-native';
import { Log } from 'src/log.js';
import { ItemListComponent } from 'src/components/item-list.js';
import { _ } from 'src/locale.js';

class NoteListComponent extends ItemListComponent {

	listView_itemPress(noteId) {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Note',
			noteId: noteId,
		});
	}

}

const NoteList = connect(
	(state) => {
		return { items: state.notes };
	}
)(NoteListComponent)

export { NoteList };