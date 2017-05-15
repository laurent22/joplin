import React, { Component } from 'react';
import { connect } from 'react-redux'
import { ListView, Text, TouchableHighlight } from 'react-native';
import { Log } from 'src/log.js';
import { ItemListComponent } from 'src/components/item-list.js';
import { Note } from 'src/models/note.js';
import { _ } from 'src/locale.js';

class FolderListComponent extends ItemListComponent {

	listView_itemClick = (folderId) => {

		Note.previews(folderId).then((notes) => {
			this.props.dispatch({
				type: 'NOTES_UPDATE_ALL',
				notes: notes,
			});

			this.props.dispatch({
				type: 'Navigation/NAVIGATE',
				routeName: 'Notes',
				folderId: folderId,
			});
		}).catch((error) => {
			Log.warn('Cannot load notes', error);
		});
	}

}

const FolderList = connect(
	(state) => {
		return { items: state.folders };
	}
)(FolderListComponent)

export { FolderList };