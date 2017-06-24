import React, { Component } from 'react';
import { connect } from 'react-redux'
import { ListView, Text, TouchableHighlight } from 'react-native';
import { Log } from 'lib/log.js';
import { ItemListComponent } from 'lib/components/item-list.js';
import { Note } from 'lib/models/note.js';
import { Folder } from 'lib/models/folder.js';
import { _ } from 'lib/locale.js';
import { NoteFolderService } from 'lib/services/note-folder-service.js';

class FolderListComponent extends ItemListComponent {

	listView_itemPress(folderId) {
		NoteFolderService.openNoteList(folderId);
	}

}

const FolderList = connect(
	(state) => {
		return {
			items: state.folders,
		};
	}
)(FolderListComponent)

export { FolderList };