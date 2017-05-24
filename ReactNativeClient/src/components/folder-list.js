import React, { Component } from 'react';
import { connect } from 'react-redux'
import { ListView, Text, TouchableHighlight } from 'react-native';
import { Log } from 'src/log.js';
import { ItemListComponent } from 'src/components/item-list.js';
import { Note } from 'src/models/note.js';
import { Folder } from 'src/models/folder.js';
import { _ } from 'src/locale.js';
import { NoteFolderService } from 'src/services/note-folder-service.js';

class FolderListComponent extends ItemListComponent {

	listView_itemPress = (folderId) => {
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