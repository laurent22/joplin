'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const react_native_1 = require('react-native');
const reducer_1 = require('@joplin/lib/reducer');
const react_redux_1 = require('react-redux');
const NoteList_1 = require('../NoteList');
const Folder_1 = require('@joplin/lib/models/Folder');
const Tag_1 = require('@joplin/lib/models/Tag');
const Note_1 = require('@joplin/lib/models/Note');
const Setting_1 = require('@joplin/lib/models/Setting');
const global_style_1 = require('../global-style');
const ScreenHeader_1 = require('../ScreenHeader');
const locale_1 = require('@joplin/lib/locale');
const FloatingActionButton_1 = require('../buttons/FloatingActionButton');
const base_screen_1 = require('../base-screen');
const trash_1 = require('@joplin/lib/services/trash');
const AccessibleView_1 = require('../accessibility/AccessibleView');
const DialogManager_1 = require('../DialogManager');
const react_1 = require('react');
class NotesScreenComponent extends base_screen_1.BaseScreenComponent {
	constructor(props) {
		super(props);
		this.onAppStateChangeSub_ = null;
		this.styles_ = {};
		this.onAppStateChange_ = async () => {
			// Force an update to the notes list when app state changes
			const newProps = { ...this.props };
			newProps.notesSource = '';
			await this.refreshNotes(newProps);
		};
		this.sortButton_press = async () => {
			const buttons = [];
			const sortNoteOptions = Setting_1.default.enumOptions('notes.sortOrder.field');
			for (const field in sortNoteOptions) {
				if (!sortNoteOptions.hasOwnProperty(field)) { continue; }
				buttons.push({
					text: sortNoteOptions[field],
					iconChecked: 'fas fa-circle',
					checked: Setting_1.default.value('notes.sortOrder.field') === field,
					id: { name: 'notes.sortOrder.field', value: field },
				});
			}
			buttons.push({
				text: `[ ${Setting_1.default.settingMetadata('notes.sortOrder.reverse').label()} ]`,
				checked: Setting_1.default.value('notes.sortOrder.reverse'),
				id: { name: 'notes.sortOrder.reverse', value: !Setting_1.default.value('notes.sortOrder.reverse') },
			});
			buttons.push({
				text: `[ ${Setting_1.default.settingMetadata('uncompletedTodosOnTop').label()} ]`,
				checked: Setting_1.default.value('uncompletedTodosOnTop'),
				id: { name: 'uncompletedTodosOnTop', value: !Setting_1.default.value('uncompletedTodosOnTop') },
			});
			buttons.push({
				text: `[ ${Setting_1.default.settingMetadata('showCompletedTodos').label()} ]`,
				checked: Setting_1.default.value('showCompletedTodos'),
				id: { name: 'showCompletedTodos', value: !Setting_1.default.value('showCompletedTodos') },
			});
			const r = await this.props.dialogManager.showMenu(Setting_1.default.settingMetadata('notes.sortOrder.field').label(), buttons);
			if (!r) { return; }
			Setting_1.default.setValue(r.name, r.value);
		};
		this.newNoteNavigate = async (folderId, isTodo) => {
			try {
				const newNote = await Note_1.default.save({
					parent_id: folderId,
					is_todo: isTodo ? 1 : 0,
				}, { provisional: true });
				this.props.dispatch({
					type: 'NAV_GO',
					routeName: 'Note',
					noteId: newNote.id,
				});
			} catch (error) {
				alert((0, locale_1._)('Cannot create a new note: %s', error.message));
			}
		};
	}
	styles() {
		if (!this.styles_) { this.styles_ = {}; }
		const themeId = this.props.themeId;
		const cacheKey = themeId;
		if (this.styles_[cacheKey]) { return this.styles_[cacheKey]; }
		this.styles_ = {};
		const styles = {
			noteList: {
				flex: 1,
			},
		};
		this.styles_[cacheKey] = react_native_1.StyleSheet.create(styles);
		return this.styles_[cacheKey];
	}
	async componentDidMount() {
		await this.refreshNotes();
		this.onAppStateChangeSub_ = react_native_1.AppState.addEventListener('change', this.onAppStateChange_);
	}
	async componentWillUnmount() {
		if (this.onAppStateChangeSub_) { this.onAppStateChangeSub_.remove(); }
	}
	async componentDidUpdate(prevProps) {
		if (prevProps.notesOrder !== this.props.notesOrder || prevProps.selectedFolderId !== this.props.selectedFolderId || prevProps.selectedTagId !== this.props.selectedTagId || prevProps.selectedSmartFilterId !== this.props.selectedSmartFilterId || prevProps.notesParentType !== this.props.notesParentType || prevProps.uncompletedTodosOnTop !== this.props.uncompletedTodosOnTop || prevProps.showCompletedTodos !== this.props.showCompletedTodos) {
			await this.refreshNotes(this.props);
		}
	}
	async refreshNotes(props = null) {
		if (props === null) { props = this.props; }
		const options = {
			order: props.notesOrder,
			uncompletedTodosOnTop: props.uncompletedTodosOnTop,
			showCompletedTodos: props.showCompletedTodos,
			caseInsensitive: true,
		};
		const parent = this.parentItem(props);
		if (!parent) { return; }
		const source = JSON.stringify({
			options: options,
			parentId: parent.id,
		});
		if (source === props.notesSource) { return; }
		// For now, search refresh is handled by the search screen.
		if (props.notesParentType === 'Search') { return; }
		let notes = [];
		if (props.notesParentType === 'Folder') {
			notes = await Note_1.default.previews(props.selectedFolderId, options);
		} else if (props.notesParentType === 'Tag') {
			notes = await Tag_1.default.notes(props.selectedTagId, options);
		} else if (props.notesParentType === 'SmartFilter') {
			notes = await Note_1.default.previews(null, options);
		}
		this.props.dispatch({
			type: 'NOTE_UPDATE_ALL',
			notes: notes,
			notesSource: source,
		});
	}
	parentItem(props = null) {
		if (!props) { props = this.props; }
		let output = null;
		if (props.notesParentType === 'Folder') {
			output = Folder_1.default.byId(props.folders, props.selectedFolderId);
		} else if (props.notesParentType === 'Tag') {
			output = Tag_1.default.byId(props.tags, props.selectedTagId);
		} else if (props.notesParentType === 'SmartFilter') {
			output = { id: this.props.selectedSmartFilterId, title: (0, locale_1._)('All notes') };
		} else {
			return null;
			// throw new Error('Invalid parent type: ' + props.notesParentType);
		}
		return output;
	}
	folderPickerOptions() {
		const options = {
			visible: this.props.noteSelectionEnabled,
			mustSelect: true,
		};
		if (this.folderPickerOptions_ && options.visible === this.folderPickerOptions_.visible) { return this.folderPickerOptions_; }
		this.folderPickerOptions_ = options;
		return this.folderPickerOptions_;
	}
	render() {
		const parent = this.parentItem();
		const theme = (0, global_style_1.themeStyle)(this.props.themeId);
		const rootStyle = this.props.visible ? theme.rootStyle : theme.hiddenRootStyle;
		const title = parent ? parent.title : null;
		if (!parent) {
			return (React.createElement(react_native_1.View, { style: rootStyle },
				React.createElement(ScreenHeader_1.ScreenHeader, { title: title, showSideMenuButton: true, showBackButton: false })));
		}
		const icon = Folder_1.default.unserializeIcon(parent.icon);
		const iconString = icon ? `${icon.emoji} ` : '';
		let buttonFolderId = this.props.selectedFolderId !== Folder_1.default.conflictFolderId() ? this.props.selectedFolderId : null;
		if (!buttonFolderId) { buttonFolderId = this.props.activeFolderId; }
		const addFolderNoteButtons = !!buttonFolderId;
		const makeActionButtonComp = () => {
			if ((this.props.notesParentType === 'Folder' && (0, trash_1.itemIsInTrash)(parent)) || !Folder_1.default.atLeastOneRealFolderExists(this.props.folders)) { return null; }
			if (addFolderNoteButtons && this.props.folders.length > 0) {
				const buttons = [];
				buttons.push({
					label: (0, locale_1._)('New to-do'),
					onPress: async () => {
						const isTodo = true;
						void this.newNoteNavigate(buttonFolderId, isTodo);
					},
					color: '#9b59b6',
					icon: 'checkbox-outline',
				});
				buttons.push({
					label: (0, locale_1._)('New note'),
					onPress: async () => {
						const isTodo = false;
						void this.newNoteNavigate(buttonFolderId, isTodo);
					},
					color: '#9b59b6',
					icon: 'document',
				});
				return React.createElement(FloatingActionButton_1.default, { buttons: buttons, dispatch: this.props.dispatch });
			}
			return null;
		};
		const actionButtonComp = this.props.noteSelectionEnabled || !this.props.visible ? null : makeActionButtonComp();
		// Ensure that screen readers can't focus the notes list when it isn't visible.
		const accessibilityHidden = !this.props.visible;
		return (React.createElement(AccessibleView_1.default, { style: rootStyle, inert: accessibilityHidden },
			React.createElement(ScreenHeader_1.ScreenHeader, { title: iconString + title, showBackButton: false, sortButton_press: this.sortButton_press, folderPickerOptions: this.folderPickerOptions(), showSearchButton: true, showSideMenuButton: true }),
			React.createElement(NoteList_1.default, null),
			actionButtonComp));
	}
}
const NotesScreenWrapper = props => {
	const dialogManager = (0, react_1.useContext)(DialogManager_1.DialogContext);
	return React.createElement(NotesScreenComponent, { ...props, dialogManager: dialogManager });
};
const NotesScreen = (0, react_redux_1.connect)((state) => {
	return {
		folders: state.folders,
		tags: state.tags,
		activeFolderId: state.settings.activeFolderId,
		selectedFolderId: state.selectedFolderId,
		selectedNoteIds: state.selectedNoteIds,
		selectedTagId: state.selectedTagId,
		selectedSmartFilterId: state.selectedSmartFilterId,
		notesParentType: state.notesParentType,
		notes: state.notes,
		notesSource: state.notesSource,
		uncompletedTodosOnTop: state.settings.uncompletedTodosOnTop,
		showCompletedTodos: state.settings.showCompletedTodos,
		themeId: state.settings.theme,
		noteSelectionEnabled: state.noteSelectionEnabled,
		notesOrder: reducer_1.stateUtils.notesOrder(state.settings),
	};
})(NotesScreenWrapper);
exports.default = NotesScreen;
// # sourceMappingURL=Notes.js.map
