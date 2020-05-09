import * as React from 'react';
const { connect } = require('react-redux');
const { buildStyle } = require('../../theme.js');
const Toolbar = require('../Toolbar.min.js');
const Note = require('lib/models/Note');
const Folder = require('lib/models/Folder');
const { time } = require('lib/time-utils.js');
const { _ } = require('lib/locale');
const { substrWithEllipsis } = require('lib/string-utils');

interface ButtonClickEvent {
	name: string,
}

interface NoteToolbarProps {
	theme: number,
	style: any,
	selectedFolderId: string,
	folders: any[],
	watchedNoteFiles: string[],
	notesParentType: string,
	note: any,
	dispatch: Function,
	onButtonClick(event:ButtonClickEvent):void,
	historyNotes: any[],
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

function useToolbarItems(props:NoteToolbarProps) {
	const { note, selectedFolderId, folders, watchedNoteFiles, notesParentType, dispatch, onButtonClick, historyNotes } = props;

	const toolbarItems = [];

	const folder = Folder.byId(folders, selectedFolderId);

	if (folder && ['Search', 'Tag', 'SmartFilter'].includes(notesParentType)) {
		toolbarItems.push({
			title: _('In: %s', substrWithEllipsis(folder.title, 0, 16)),
			iconName: 'fa-book',
			onClick: () => {
				props.dispatch({
					type: 'FOLDER_AND_NOTE_SELECT',
					folderId: folder.id,
					noteId: note.id,
				});
				Folder.expandTree(folders, folder.parent_id);
			},
		});
	}

	if (historyNotes.length) {
		toolbarItems.push({
			tooltip: _('Back'),
			iconName: 'fa-arrow-left',
			onClick: () => {
				if (!historyNotes.length) return;

				const lastItem = historyNotes[historyNotes.length - 1];

				dispatch({
					type: 'FOLDER_AND_NOTE_SELECT',
					folderId: lastItem.parent_id,
					noteId: lastItem.id,
					historyNoteAction: 'pop',
				});
			},
		});
	}

	if (watchedNoteFiles.indexOf(note.id) >= 0) {
		toolbarItems.push({
			tooltip: _('Click to stop external editing'),
			title: _('Watching...'),
			iconName: 'fa-external-link',
			onClick: () => {
				onButtonClick({ name: 'stopExternalEditing' });
			},
		});
	} else {
		toolbarItems.push({
			tooltip: _('Edit in external editor'),
			iconName: 'fa-external-link',
			onClick: () => {
				onButtonClick({ name: 'startExternalEditing' });
			},
		});
	}

	toolbarItems.push({
		tooltip: _('Tags'),
		iconName: 'fa-tags',
		onClick: () => {
			onButtonClick({ name: 'setTags' });
		},
	});

	if (note.is_todo) {
		const item:any = {
			iconName: 'fa-clock-o',
			enabled: !note.todo_completed,
			onClick: () => {
				onButtonClick({ name: 'setAlarm' });
			},
		};
		if (Note.needAlarm(note)) {
			item.title = time.formatMsToLocal(note.todo_due);
		} else {
			item.tooltip = _('Set alarm');
		}
		toolbarItems.push(item);
	}

	toolbarItems.push({
		tooltip: _('Note properties'),
		iconName: 'fa-info-circle',
		onClick: () => {
			dispatch({
				type: 'WINDOW_COMMAND',
				name: 'commandNoteProperties',
				noteId: note.id,
				onRevisionLinkClick: () => {
					onButtonClick({ name: 'showRevisions' });
				},
			});
		},
	});

	return toolbarItems;
}

function NoteToolbar(props:NoteToolbarProps) {
	const styles = styles_(props);
	const toolbarItems = useToolbarItems(props);
	return <Toolbar style={styles.root} items={toolbarItems} />;
}

const mapStateToProps = (state:any) => {
	return {
		selectedFolderId: state.selectedFolderId,
		folders: state.folders,
		watchedNoteFiles: state.watchedNoteFiles,
		historyNotes: state.historyNotes,
		notesParentType: state.notesParentType,
	};
};

export default connect(mapStateToProps)(NoteToolbar);
