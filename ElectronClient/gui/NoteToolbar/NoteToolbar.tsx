import * as React from 'react';
import { useEffect, useCallback, useState } from 'react';
import CommandService from '../../lib/services/CommandService';
const { connect } = require('react-redux');
const { buildStyle } = require('lib/theme');
const Toolbar = require('../Toolbar.min.js');
const Folder = require('lib/models/Folder');
const { _ } = require('lib/locale');
const { substrWithEllipsis } = require('lib/string-utils');

interface ButtonClickEvent {
	name: string,
}

interface NoteToolbarProps {
	theme: number,
	style: any,
	folders: any[],
	watchedNoteFiles: string[],
	backwardHistoryNotes: any[],
	forwardHistoryNotes: any[],
	notesParentType: string,
	note: any,
	dispatch: Function,
	onButtonClick(event:ButtonClickEvent):void,
}

function styles_(props:NoteToolbarProps) {
	return buildStyle('NoteToolbar', props.theme, (/* theme:any*/) => {
		return {
			root: {
				...props.style,
				borderBottom: 'none',
			},
		};
	});
}

function NoteToolbar(props:NoteToolbarProps) {
	const styles = styles_(props);
	const [toolbarItems, setToolbarItems] = useState([]);
	const selectedNoteFolder = Folder.byId(props.folders, props.note.parent_id);
	const folderId = selectedNoteFolder ? selectedNoteFolder.id : '';
	const folderTitle = selectedNoteFolder && selectedNoteFolder.title ? selectedNoteFolder.title : '';

	const cmdService = CommandService.instance();

	const updateToolbarItems = useCallback(() => {
		const output = [];

		output.push(
			cmdService.commandToToolbarButton('historyBackward')
		);

		output.push(
			cmdService.commandToToolbarButton('historyForward')
		);

		if (folderId && ['Search', 'Tag', 'SmartFilter'].includes(props.notesParentType)) {
			output.push({
				title: _('In: %s', substrWithEllipsis(folderTitle, 0, 16)),
				tooltip: folderTitle,
				iconName: 'fa-book',
				onClick: () => {
					props.dispatch({
						type: 'FOLDER_AND_NOTE_SELECT',
						folderId: folderId,
						noteId: props.note.id,
					});
				},
			});
		}

		output.push(cmdService.commandToToolbarButton('showNoteProperties'));

		if (props.watchedNoteFiles.indexOf(props.note.id) >= 0) {
			output.push(cmdService.commandToToolbarButton('stopExternalEditing'));
		} else {
			output.push(cmdService.commandToToolbarButton('startExternalEditing'));
		}

		output.push(cmdService.commandToToolbarButton('editAlarm'));

		output.push(cmdService.commandToToolbarButton('setTags'));

		setToolbarItems(output);
	}, [props.note.id, folderId, folderTitle, props.watchedNoteFiles, props.notesParentType]);

	useEffect(() => {
		updateToolbarItems();
		cmdService.on('commandsEnabledStateChange', updateToolbarItems);
		return () => {
			cmdService.off('commandsEnabledStateChange', updateToolbarItems);
		};
	}, [updateToolbarItems]);

	return <Toolbar style={styles.root} items={toolbarItems} />;
}

const mapStateToProps = (state:any) => {
	return {
		folders: state.folders,
		watchedNoteFiles: state.watchedNoteFiles,
		backwardHistoryNotes: state.backwardHistoryNotes,
		forwardHistoryNotes: state.forwardHistoryNotes,
		notesParentType: state.notesParentType,
	};
};

export default connect(mapStateToProps)(NoteToolbar);
