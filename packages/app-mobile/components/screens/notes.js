const React = require('react');

const { AppState, View, StyleSheet } = require('react-native');
const { stateUtils } = require('@joplin/lib/reducer');
const { connect } = require('react-redux');
const { NoteList } = require('../note-list.js');
const Folder = require('@joplin/lib/models/Folder').default;
const Tag = require('@joplin/lib/models/Tag').default;
const Note = require('@joplin/lib/models/Note').default;
const Setting = require('@joplin/lib/models/Setting').default;
const { themeStyle } = require('../global-style.js');
const { ScreenHeader } = require('../ScreenHeader');
const { _ } = require('@joplin/lib/locale');
const ActionButton = require('../ActionButton').default;
const { dialogs } = require('../../utils/dialogs.js');
const DialogBox = require('react-native-dialogbox').default;
const { BaseScreenComponent } = require('../base-screen.js');
const { BackButtonService } = require('../../services/back-button.js');

class NotesScreenComponent extends BaseScreenComponent {
	static navigationOptions() {
		return { header: null };
	}

	constructor() {
		super();

		this.onAppStateChange_ = async () => {
			// Force an update to the notes list when app state changes
			const newProps = Object.assign({}, this.props);
			newProps.notesSource = '';
			await this.refreshNotes(newProps);
		};

		this.sortButton_press = async () => {
			const buttons = [];
			const sortNoteOptions = Setting.enumOptions('notes.sortOrder.field');

			const makeCheckboxText = function(selected, sign, label) {
				const s = sign === 'tick' ? '✓' : '⬤';
				return (selected ? `${s} ` : '') + label;
			};

			for (const field in sortNoteOptions) {
				if (!sortNoteOptions.hasOwnProperty(field)) continue;
				buttons.push({
					text: makeCheckboxText(Setting.value('notes.sortOrder.field') === field, 'bullet', sortNoteOptions[field]),
					id: { name: 'notes.sortOrder.field', value: field },
				});
			}

			buttons.push({
				text: makeCheckboxText(Setting.value('notes.sortOrder.reverse'), 'tick', `[ ${Setting.settingMetadata('notes.sortOrder.reverse').label()} ]`),
				id: { name: 'notes.sortOrder.reverse', value: !Setting.value('notes.sortOrder.reverse') },
			});

			buttons.push({
				text: makeCheckboxText(Setting.value('uncompletedTodosOnTop'), 'tick', `[ ${Setting.settingMetadata('uncompletedTodosOnTop').label()} ]`),
				id: { name: 'uncompletedTodosOnTop', value: !Setting.value('uncompletedTodosOnTop') },
			});

			buttons.push({
				text: makeCheckboxText(Setting.value('showCompletedTodos'), 'tick', `[ ${Setting.settingMetadata('showCompletedTodos').label()} ]`),
				id: { name: 'showCompletedTodos', value: !Setting.value('showCompletedTodos') },
			});

			const r = await dialogs.pop(this, Setting.settingMetadata('notes.sortOrder.field').label(), buttons);
			if (!r) return;

			Setting.setValue(r.name, r.value);
		};

		this.backHandler = () => {
			if (this.dialogbox && this.dialogbox.state && this.dialogbox.state.isVisible) {
				this.dialogbox.close();
				return true;
			}
			return false;
		};
	}

	styles() {
		if (!this.styles_) this.styles_ = {};
		const themeId = this.props.themeId;
		const cacheKey = themeId;

		if (this.styles_[cacheKey]) return this.styles_[cacheKey];
		this.styles_ = {};

		const styles = {
			noteList: {
				flex: 1,
			},
		};

		this.styles_[cacheKey] = StyleSheet.create(styles);
		return this.styles_[cacheKey];
	}

	async componentDidMount() {
		BackButtonService.addHandler(this.backHandler);
		await this.refreshNotes();
		AppState.addEventListener('change', this.onAppStateChange_);
	}

	async componentWillUnmount() {
		AppState.removeEventListener('change', this.onAppStateChange_);
		BackButtonService.removeHandler(this.backHandler);
	}

	async componentDidUpdate(prevProps) {
		if (prevProps.notesOrder !== this.props.notesOrder || prevProps.selectedFolderId !== this.props.selectedFolderId || prevProps.selectedTagId !== this.props.selectedTagId || prevProps.selectedSmartFilterId !== this.props.selectedSmartFilterId || prevProps.notesParentType !== this.props.notesParentType) {
			await this.refreshNotes(this.props);
		}
	}

	async refreshNotes(props = null) {
		if (props === null) props = this.props;

		const options = {
			order: props.notesOrder,
			uncompletedTodosOnTop: props.uncompletedTodosOnTop,
			showCompletedTodos: props.showCompletedTodos,
			caseInsensitive: true,
		};

		const parent = this.parentItem(props);
		if (!parent) return;

		const source = JSON.stringify({
			options: options,
			parentId: parent.id,
		});

		if (source === props.notesSource) return;

		let notes = [];
		if (props.notesParentType === 'Folder') {
			notes = await Note.previews(props.selectedFolderId, options);
		} else if (props.notesParentType === 'Tag') {
			notes = await Tag.notes(props.selectedTagId, options);
		} else if (props.notesParentType === 'SmartFilter') {
			notes = await Note.previews(null, options);
		}

		this.props.dispatch({
			type: 'NOTE_UPDATE_ALL',
			notes: notes,
			notesSource: source,
		});
	}

	deleteFolder_onPress(folderId) {
		dialogs.confirm(this, _('Delete notebook? All notes and sub-notebooks within this notebook will also be deleted.')).then(ok => {
			if (!ok) return;

			Folder.delete(folderId)
				.then(() => {
					this.props.dispatch({
						type: 'NAV_GO',
						routeName: 'Notes',
						smartFilterId: 'c3176726992c11e9ac940492261af972',
					});
				})
				.catch(error => {
					alert(error.message);
				});
		});
	}

	editFolder_onPress(folderId) {
		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Folder',
			folderId: folderId,
		});
	}

	newNoteNavigate = async (folderId, isTodo) => {
		const newNote = await Note.save({
			parent_id: folderId,
			is_todo: isTodo ? 1 : 0,
		}, { provisional: true });

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Note',
			noteId: newNote.id,
		});
	};

	parentItem(props = null) {
		if (!props) props = this.props;

		let output = null;
		if (props.notesParentType === 'Folder') {
			output = Folder.byId(props.folders, props.selectedFolderId);
		} else if (props.notesParentType === 'Tag') {
			output = Tag.byId(props.tags, props.selectedTagId);
		} else if (props.notesParentType === 'SmartFilter') {
			output = { id: this.props.selectedSmartFilterId, title: _('All notes') };
		} else {
			return null;
			// throw new Error('Invalid parent type: ' + props.notesParentType);
		}
		return output;
	}

	folderPickerOptions() {
		const options = {
			enabled: this.props.noteSelectionEnabled,
			mustSelect: true,
		};

		if (this.folderPickerOptions_ && options.enabled === this.folderPickerOptions_.enabled) return this.folderPickerOptions_;

		this.folderPickerOptions_ = options;
		return this.folderPickerOptions_;
	}

	render() {
		const parent = this.parentItem();
		const theme = themeStyle(this.props.themeId);

		const rootStyle = {
			flex: 1,
			backgroundColor: theme.backgroundColor,
		};

		if (!this.props.visible) {
			rootStyle.flex = 0.001; // This is a bit of a hack but it seems to work fine - it makes the component invisible but without unmounting it
		}

		const title = parent ? parent.title : null;
		if (!parent) {
			return (
				<View style={rootStyle}>
					<ScreenHeader title={title} showSideMenuButton={true} showBackButton={false} />
				</View>
			);
		}

		const icon = Folder.unserializeIcon(parent.icon);
		const iconString = icon ? `${icon.emoji} ` : '';

		let buttonFolderId = this.props.selectedFolderId !== Folder.conflictFolderId() ? this.props.selectedFolderId : null;
		if (!buttonFolderId) buttonFolderId = this.props.activeFolderId;

		const addFolderNoteButtons = !!buttonFolderId;
		const thisComp = this;

		const makeActionButtonComp = () => {
			if (addFolderNoteButtons && this.props.folders.length > 0) {
				const buttons = [];
				buttons.push({
					label: _('New to-do'),
					onPress: () => {
						const isTodo = true;
						this.newNoteNavigate(buttonFolderId, isTodo);
					},
					color: '#9b59b6',
					icon: 'md-checkbox-outline',
				});

				buttons.push({
					label: _('New note'),
					onPress: () => {
						const isTodo = false;
						this.newNoteNavigate(buttonFolderId, isTodo);
					},
					color: '#9b59b6',
					icon: 'md-document',
				});
				return <ActionButton buttons={buttons}/>;
			}
			return null;
		};

		const actionButtonComp = this.props.noteSelectionEnabled || !this.props.visible ? null : makeActionButtonComp();

		return (
			<View style={rootStyle}>
				<ScreenHeader title={iconString + title} showBackButton={false} parentComponent={thisComp} sortButton_press={this.sortButton_press} folderPickerOptions={this.folderPickerOptions()} showSearchButton={true} showSideMenuButton={true} />
				<NoteList style={this.styles().noteList} />
				{actionButtonComp}
				<DialogBox
					ref={dialogbox => {
						this.dialogbox = dialogbox;
					}}
				/>
			</View>
		);
	}
}

const NotesScreen = connect(state => {
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
		notesOrder: stateUtils.notesOrder(state.settings),
	};
})(NotesScreenComponent);

module.exports = { NotesScreen };
